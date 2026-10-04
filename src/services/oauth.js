import crypto from 'node:crypto';
import { OAuthAuthorizationCode } from '../models/oauth-authorization-code.js';
import { OAuthClient } from '../models/oauth-client.js';
import { OAuthToken } from '../models/oauth-token.js';

const DEFAULT_SCOPE = 'config:read';
const DEFAULT_GRANT_TYPES = ['authorization_code', 'refresh_token'];
const DEFAULT_RESPONSE_TYPES = ['code'];
const DEFAULT_TOKEN_ENDPOINT_AUTH_METHOD = 'none';
const AUTHORIZATION_CODE_TTL_IN_MS = 10 * 60 * 1000;
const ACCESS_TOKEN_TTL_IN_MS = 60 * 60 * 1000;
const REFRESH_TOKEN_TTL_IN_MS = 30 * 24 * 60 * 60 * 1000;

function generateRandomValue() {
    return crypto.randomBytes(32).toString('hex');
}

function resolveScope(scope) {
    return scope || DEFAULT_SCOPE;
}

function validateScope(scope) {
    if (scope && scope !== DEFAULT_SCOPE) {
        throw new Error('Invalid scope');
    }
}

function validateSupportedValues(values, supportedValues, field) {
    if (!values?.length) {
        return;
    }

    const hasUnsupportedValue = values.some((value) => !supportedValues.includes(value));

    if (hasUnsupportedValue) {
        throw new Error(`Invalid ${field}`);
    }
}

function normalizeRedirectUri(redirectUri) {
    let url;

    try {
        url = new URL(redirectUri);
    } catch {
        throw new Error('Invalid redirect_uri');
    }

    if (url.hash) {
        throw new Error('Invalid redirect_uri');
    }

    const isLoopback = url.protocol === 'http:' && ['127.0.0.1', 'localhost'].includes(url.hostname);
    const isHttps = url.protocol === 'https:';

    if (!isLoopback && !isHttps) {
        throw new Error('Invalid redirect_uri');
    }

    return url.toString();
}

function verifyRedirectUri(client, redirectUri) {
    const normalizedRedirectUri = normalizeRedirectUri(redirectUri);

    if (!client.redirect_uris.includes(normalizedRedirectUri)) {
        throw new Error('Invalid redirect_uri');
    }

    return normalizedRedirectUri;
}

function buildPkceChallenge(codeVerifier) {
    return crypto.createHash('sha256')
        .update(codeVerifier)
        .digest('base64url');
}

function buildTokenPayload(token) {
    return {
        access_token: token.access_token,
        token_type: 'Bearer',
        expires_in: Math.max(0, Math.floor((token.accessTokenExpiresAt.getTime() - Date.now()) / 1000)),
        refresh_token: token.refresh_token,
        scope: token.scope
    };
}

function buildRegistrationResponse(client) {
    return {
        client_id: client.client_id,
        client_id_issued_at: Math.floor(client.createdAt.getTime() / 1000),
        client_name: client.client_name,
        redirect_uris: client.redirect_uris,
        grant_types: client.grant_types,
        response_types: client.response_types,
        token_endpoint_auth_method: client.token_endpoint_auth_method,
        scope: client.scope
    };
}

async function getClient(client_id) {
    const client = await OAuthClient.findOne({ client_id }).exec();

    if (!client) {
        throw new Error('Invalid client_id');
    }

    return client;
}

async function issueTokenPair({ client_id, admin, scope }) {
    const now = Date.now();

    const token = new OAuthToken({
        access_token: generateRandomValue(),
        refresh_token: generateRandomValue(),
        client_id,
        admin: admin._id || admin,
        scope: resolveScope(scope),
        accessTokenExpiresAt: new Date(now + ACCESS_TOKEN_TTL_IN_MS),
        refreshTokenExpiresAt: new Date(now + REFRESH_TOKEN_TTL_IN_MS)
    });

    await token.save();
    return token;
}

export function isRegisteredRedirectUri(client, redirectUri) {
    try {
        verifyRedirectUri(client, redirectUri);
        return true;
    } catch {
        return false;
    }
}

export async function getOAuthClientById(client_id) {
    return getClient(client_id);
}

export async function registerClient({
    client_name,
    redirect_uris,
    grant_types,
    response_types,
    token_endpoint_auth_method,
    scope
}) {
    if (!redirect_uris?.length) {
        throw new Error('redirect_uris is required');
    }

    if (token_endpoint_auth_method && token_endpoint_auth_method !== DEFAULT_TOKEN_ENDPOINT_AUTH_METHOD) {
        throw new Error('Invalid token_endpoint_auth_method');
    }

    validateScope(scope);
    validateSupportedValues(grant_types, DEFAULT_GRANT_TYPES, 'grant_types');
    validateSupportedValues(response_types, DEFAULT_RESPONSE_TYPES, 'response_types');

    const client = new OAuthClient({
        client_id: generateRandomValue(),
        client_name,
        redirect_uris: redirect_uris.map(normalizeRedirectUri),
        grant_types: grant_types?.length ? grant_types : DEFAULT_GRANT_TYPES,
        response_types: response_types?.length ? response_types : DEFAULT_RESPONSE_TYPES,
        token_endpoint_auth_method: token_endpoint_auth_method || DEFAULT_TOKEN_ENDPOINT_AUTH_METHOD,
        scope: resolveScope(scope)
    });

    await client.save();
    return buildRegistrationResponse(client);
}

export async function createAuthorizationCode({
    client_id,
    admin,
    redirect_uri,
    scope,
    code_challenge,
    code_challenge_method
}) {
    const client = await getClient(client_id);
    const resolvedRedirectUri = verifyRedirectUri(client, redirect_uri);

    validateScope(scope);

    if (!code_challenge) {
        throw new Error('Invalid code_challenge');
    }

    if (code_challenge_method !== 'S256') {
        throw new Error('Invalid code_challenge_method');
    }

    const authorizationCode = new OAuthAuthorizationCode({
        code: generateRandomValue(),
        client_id,
        admin: admin._id || admin,
        redirect_uri: resolvedRedirectUri,
        scope: resolveScope(scope || client.scope),
        code_challenge,
        code_challenge_method,
        expiresAt: new Date(Date.now() + AUTHORIZATION_CODE_TTL_IN_MS)
    });

    await authorizationCode.save();
    return authorizationCode.code;
}

export async function exchangeAuthorizationCode({
    client_id,
    code,
    redirect_uri,
    code_verifier
}) {
    const client = await getClient(client_id);
    const resolvedRedirectUri = verifyRedirectUri(client, redirect_uri);

    if (!code_verifier) {
        throw new Error('Invalid code_verifier');
    }

    const authorizationCode = await OAuthAuthorizationCode.findOne({
        code,
        client_id
    }).exec();

    if (!authorizationCode || authorizationCode.used) {
        throw new Error('Invalid authorization code');
    }

    if (authorizationCode.expiresAt.getTime() <= Date.now()) {
        throw new Error('Authorization code expired');
    }

    authorizationCode.used = true;
    await authorizationCode.save();

    if (authorizationCode.redirect_uri !== resolvedRedirectUri) {
        throw new Error('Invalid redirect_uri');
    }

    if (authorizationCode.code_challenge_method !== 'S256') {
        throw new Error('Invalid code_challenge_method');
    }

    if (buildPkceChallenge(code_verifier) !== authorizationCode.code_challenge) {
        throw new Error('Invalid code_verifier');
    }

    const token = await issueTokenPair({
        client_id,
        admin: authorizationCode.admin,
        scope: authorizationCode.scope || client.scope
    });

    return buildTokenPayload(token);
}

export async function refreshAccessToken({
    client_id,
    refresh_token
}) {
    if (!refresh_token) {
        throw new Error('Invalid refresh token');
    }

    await getClient(client_id);

    const token = await OAuthToken.findOne({
        client_id,
        refresh_token,
        revoked: false
    }).exec();

    if (!token) {
        throw new Error('Invalid refresh token');
    }

    if (token.refreshTokenExpiresAt.getTime() <= Date.now()) {
        throw new Error('Refresh token expired');
    }

    token.revoked = true;
    await token.save();

    const refreshedToken = await issueTokenPair({
        client_id,
        admin: token.admin,
        scope: token.scope
    });

    return buildTokenPayload(refreshedToken);
}

export async function listAuthorizedApps(admin) {
    const tokens = await OAuthToken.find({
        admin: admin._id || admin,
        revoked: false,
        refreshTokenExpiresAt: { $gt: new Date() }
    }).sort({ createdAt: -1 }).exec();

    const clientIds = [...new Set(tokens.map((token) => token.client_id))];
    const clients = await OAuthClient.find({ client_id: { $in: clientIds } }).exec();
    const clientsById = new Map(clients.map((client) => [client.client_id, client]));

    return clientIds.map((client_id) => {
        const client = clientsById.get(client_id);
        const latestToken = tokens.find((token) => token.client_id === client_id);

        return {
            client_id,
            client_name: client?.client_name,
            scope: latestToken.scope,
            createdAt: latestToken.toJSON().createdAt
        };
    });
}

export async function revokeAuthorizedApp(admin, client_id) {
    const result = await OAuthToken.updateMany({
        admin: admin._id || admin,
        client_id,
        revoked: false
    }, {
        revoked: true
    }).exec();

    if (!result.matchedCount) {
        throw new Error('Authorized app not found');
    }
}

export async function validateAccessToken(accessToken) {
    const token = await OAuthToken.findOne({
        access_token: accessToken,
        revoked: false
    }).populate({
        path: 'admin'
    }).exec();

    if (!token) {
        throw new Error('Invalid access token');
    }

    if (token.accessTokenExpiresAt.getTime() <= Date.now()) {
        throw new Error('Access token expired');
    }

    if (!token.admin?.active) {
        throw new Error('User not active');
    }

    return token.admin;
}
