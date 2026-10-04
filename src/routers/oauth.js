import express from 'express';
import { body, query, validationResult } from 'express-validator';
import { responseException } from '../exceptions/index.js';
import { auth } from '../middleware/auth.js';
import { validate } from '../middleware/validators.js';
import * as Services from '../services/oauth.js';

const router = new express.Router();

function getBaseUrl(req) {
    return (process.env.SWITCHER_API_URL || `${req.protocol}://${req.get('host')}`).replace(/\/$/, '');
}

function getManagementBaseUrl() {
    // SAML_REDIRECT_ENDPOINT_URL already points at switcher-management for browser redirects
    // (see admin-saml.js); reuse it as a fallback so existing deployments keep working.
    const managementUrl = process.env.SWITCHER_MANAGEMENT_URL || process.env.SAML_REDIRECT_ENDPOINT_URL;
    return managementUrl ? managementUrl.replace(/\/$/, '') : undefined;
}

function buildMetadata(req) {
    const issuer = getBaseUrl(req);
    const managementBaseUrl = getManagementBaseUrl();

    return {
        issuer,
        // The authorization endpoint must be a human-facing consent screen. switcher-api's own
        // /oauth/authorize has no UI and requires an existing session, so this points at
        // switcher-management's consent page, which collects user consent and then calls
        // /oauth/authorize on this API with the result.
        authorization_endpoint: managementBaseUrl ? `${managementBaseUrl}/oauth/consent` : `${issuer}/oauth/authorize`,
        token_endpoint: `${issuer}/oauth/token`,
        registration_endpoint: `${issuer}/oauth/register`,
        scopes_supported: ['config:read'],
        response_types_supported: ['code'],
        grant_types_supported: ['authorization_code', 'refresh_token'],
        code_challenge_methods_supported: ['S256'],
        token_endpoint_auth_methods_supported: ['none']
    };
}

function getAuthorizeErrorRedirectUri(redirectUri, error, state) {
    const url = new URL(redirectUri);
    url.searchParams.set('error', error);

    if (state !== undefined) {
        url.searchParams.set('state', state);
    }

    return url.toString();
}

function wantsJsonRedirect(req) {
    // switcher-management's consent screen calls this endpoint via an authenticated
    // XHR/fetch (so it can attach the admin's session Authorization header, which a
    // top-level browser navigation cannot do) and explicitly asks for JSON so it can
    // perform the final top-level navigation to the client's redirect_uri itself.
    return req.headers.accept === 'application/json';
}

function sendAuthorizeRedirect(req, res, redirectUri) {
    if (wantsJsonRedirect(req)) {
        return res.status(200).send({ redirect_uri: redirectUri });
    }

    return res.redirect(302, redirectUri);
}

router.post('/oauth/register', [
    body('client_name').optional().isString(),
    body('redirect_uris').isArray({ min: 1 }),
    body('redirect_uris.*').isString(),
    body('grant_types').optional().isArray(),
    body('grant_types.*').optional().isString(),
    body('response_types').optional().isArray(),
    body('response_types.*').optional().isString(),
    body('token_endpoint_auth_method').optional().isString(),
    body('scope').optional().isString()
], validate, async (req, res) => {
    try {
        const client = await Services.registerClient(req.body);
        res.status(201).send(client);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.get('/oauth/authorize', auth, [
    query('response_type').optional().isString(),
    query('client_id').optional().isString(),
    query('redirect_uri').optional().isString(),
    query('scope').optional().isString(),
    query('state').optional().isString(),
    query('code_challenge').optional().isString(),
    query('code_challenge_method').optional().isString(),
    query('consent').optional().isBoolean()
], async (req, res) => {
    const {
        response_type,
        client_id,
        redirect_uri,
        scope,
        state,
        code_challenge,
        code_challenge_method
    } = req.query;

    try {
        const client = await Services.getOAuthClientById(client_id);

        if (!Services.isRegisteredRedirectUri(client, redirect_uri)) {
            throw new Error('Invalid redirect_uri');
        }

        const validationErrors = validationResult(req);

        if (!validationErrors.isEmpty()) {
            return sendAuthorizeRedirect(req, res, getAuthorizeErrorRedirectUri(redirect_uri, 'invalid_request', state));
        }

        const consentGranted = req.query.consent !== 'false';

        if (!response_type || !code_challenge || !code_challenge_method || !consentGranted) {
            const error = consentGranted ? 'invalid_request' : 'access_denied';
            return sendAuthorizeRedirect(req, res, getAuthorizeErrorRedirectUri(redirect_uri, error, state));
        }

        if (response_type !== 'code' || code_challenge_method !== 'S256') {
            return sendAuthorizeRedirect(req, res, getAuthorizeErrorRedirectUri(redirect_uri, 'invalid_request', state));
        }

        const code = await Services.createAuthorizationCode({
            client_id,
            admin: req.admin,
            redirect_uri,
            scope,
            code_challenge,
            code_challenge_method
        });

        const redirectUrl = new URL(redirect_uri);
        redirectUrl.searchParams.set('code', code);

        if (state !== undefined) {
            redirectUrl.searchParams.set('state', state);
        }

        sendAuthorizeRedirect(req, res, redirectUrl.toString());
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.post('/oauth/token', [
    body('grant_type').isString(),
    body('code').optional().isString(),
    body('redirect_uri').optional().isString(),
    body('client_id').isString(),
    body('code_verifier').optional().isString(),
    body('refresh_token').optional().isString()
], validate, async (req, res) => {
    try {
        let token;

        if (req.body.grant_type === 'authorization_code') {
            token = await Services.exchangeAuthorizationCode(req.body);
        } else if (req.body.grant_type === 'refresh_token') {
            token = await Services.refreshAccessToken(req.body);
        } else {
            return res.status(400).send({ error: 'unsupported_grant_type' });
        }

        res.send(token);
    } catch {
        res.status(400).send({ error: 'invalid_grant' });
    }
});

router.get('/oauth/authorized', auth, async (req, res) => {
    try {
        const apps = await Services.listAuthorizedApps(req.admin);
        res.send(apps);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.delete('/oauth/authorized/:client_id', auth, async (req, res) => {
    try {
        await Services.revokeAuthorizedApp(req.admin, req.params.client_id);
        res.send({ message: 'Authorized app revoked' });
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.get('/.well-known/oauth-authorization-server', (req, res) => {
    res.send(buildMetadata(req));
});

router.get('/.well-known/oauth-protected-resource', (req, res) => {
    const metadata = buildMetadata(req);

    res.send({
        resource: metadata.issuer,
        authorization_servers: [metadata.issuer],
        bearer_methods_supported: ['header'],
        ...metadata
    });
});

export default router;
