import crypto from 'node:crypto';
import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app';
import { OAuthClient } from '../src/models/oauth-client';
import { OAuthAuthorizationCode } from '../src/models/oauth-authorization-code';
import { OAuthToken } from '../src/models/oauth-token';
import Admin from '../src/models/admin';
import {
    setupDatabase,
    adminMasterAccountToken,
    adminMasterAccountId,
    domainId,
    config1Document
} from './fixtures/db_api';

const REDIRECT_URI = 'http://127.0.0.1:8945/callback';

function buildPkcePair() {
    const codeVerifier = crypto.randomBytes(32).toString('base64url');
    const codeChallenge = crypto.createHash('sha256').update(codeVerifier).digest('base64url');
    return { codeVerifier, codeChallenge };
}

async function registerClient(overrides = {}) {
    const response = await request(app)
        .post('/oauth/register')
        .send({
            client_name: 'MCP Test Client',
            redirect_uris: [REDIRECT_URI],
            ...overrides
        }).expect(201);

    return response.body;
}

async function authorizeAndExchange({ client_id }) {
    const { codeVerifier, codeChallenge } = buildPkcePair();
    const state = 'state-123';

    const authorizeResponse = await request(app)
        .get('/oauth/authorize')
        .query({
            response_type: 'code',
            client_id,
            redirect_uri: REDIRECT_URI,
            scope: 'config:read',
            state,
            code_challenge: codeChallenge,
            code_challenge_method: 'S256',
            consent: 'true'
        })
        .set('Authorization', `Bearer ${adminMasterAccountToken}`)
        .send().expect(302);

    const location = new URL(authorizeResponse.headers.location);
    const code = location.searchParams.get('code');

    const tokenResponse = await request(app)
        .post('/oauth/token')
        .send({
            grant_type: 'authorization_code',
            code,
            redirect_uri: REDIRECT_URI,
            client_id,
            code_verifier: codeVerifier
        }).expect(200);

    return { code, state, token: tokenResponse.body };
}

afterAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mongoose.disconnect();
});

describe('Testing OAuth discovery metadata', () => {
    beforeAll(setupDatabase);

    test('OAUTH_SUITE - Should return authorization server metadata', async () => {
        const response = await request(app)
            .get('/.well-known/oauth-authorization-server')
            .send().expect(200);

        expect(response.body).toMatchObject({
            authorization_endpoint: expect.stringContaining('/oauth/consent'),
            token_endpoint: expect.stringContaining('/oauth/token'),
            registration_endpoint: expect.stringContaining('/oauth/register'),
            scopes_supported: ['config:read'],
            response_types_supported: ['code'],
            grant_types_supported: ['authorization_code', 'refresh_token'],
            code_challenge_methods_supported: ['S256'],
            token_endpoint_auth_methods_supported: ['none']
        });
    });

    test('OAUTH_SUITE - Should prefer SWITCHER_MANAGEMENT_URL over SAML_REDIRECT_ENDPOINT_URL', async () => {
        //given
        process.env.SWITCHER_MANAGEMENT_URL = 'http://localhost:4201';

        //test
        const response = await request(app)
            .get('/.well-known/oauth-authorization-server')
            .send().expect(200);

        expect(response.body.authorization_endpoint).toBe('http://localhost:4201/oauth/consent');

        //teardown
        delete process.env.SWITCHER_MANAGEMENT_URL;
    });

    test('OAUTH_SUITE - Should fall back to the API authorize endpoint when no management URL is configured', async () => {
        //given
        const originalSamlRedirectEndpointUrl = process.env.SAML_REDIRECT_ENDPOINT_URL;
        delete process.env.SAML_REDIRECT_ENDPOINT_URL;

        //test
        const response = await request(app)
            .get('/.well-known/oauth-authorization-server')
            .send().expect(200);

        expect(response.body.authorization_endpoint).toBe(`${response.body.issuer}/oauth/authorize`);

        //teardown
        process.env.SAML_REDIRECT_ENDPOINT_URL = originalSamlRedirectEndpointUrl;
    });

    test('OAUTH_SUITE - Should return protected resource metadata', async () => {
        const response = await request(app)
            .get('/.well-known/oauth-protected-resource')
            .send().expect(200);

        expect(response.body).toMatchObject({
            resource: response.body.issuer,
            authorization_servers: [response.body.issuer],
            bearer_methods_supported: ['header']
        });
    });
});

describe('Testing OAuth Dynamic Client Registration', () => {
    beforeAll(setupDatabase);

    test('OAUTH_SUITE - Should register a new client', async () => {
        const client = await registerClient();

        expect(client.client_id).toEqual(expect.any(String));
        expect(client.client_name).toEqual('MCP Test Client');
        expect(client.redirect_uris).toEqual([REDIRECT_URI]);
        expect(client.grant_types).toEqual(['authorization_code', 'refresh_token']);
        expect(client.response_types).toEqual(['code']);
        expect(client.token_endpoint_auth_method).toEqual('none');
        expect(client.scope).toEqual('config:read');
        expect(client.client_id_issued_at).toEqual(expect.any(Number));

        const stored = await OAuthClient.findOne({ client_id: client.client_id }).exec();
        expect(stored).not.toBeNull();
    });

    test('OAUTH_SUITE - Should NOT register a client - missing redirect_uris', async () => {
        const response = await request(app)
            .post('/oauth/register')
            .send({ client_name: 'No Redirect' }).expect(422);
        
        expect(response.body.error).not.toBeNull();
    });

    test('OAUTH_SUITE - Should NOT register a client - invalid token_endpoint_auth_method', async () => {
        const response = await request(app)
            .post('/oauth/register')
            .send({
                redirect_uris: [REDIRECT_URI],
                token_endpoint_auth_method: 'client_secret_basic'
            }).expect(400);
        
        expect(response.body.error).not.toBeNull();
    });

    test('OAUTH_SUITE - Should NOT register a client - unsupported grant_types', async () => {
        const response = await request(app)
            .post('/oauth/register')
            .send({
                redirect_uris: [REDIRECT_URI],
                grant_types: ['implicit']
            }).expect(400);
        
        expect(response.body.error).not.toBeNull();
    });

    test('OAUTH_SUITE - Should NOT register a client - unsupported response_types', async () => {
        const response = await request(app)
            .post('/oauth/register')
            .send({
                redirect_uris: [REDIRECT_URI],
                response_types: ['token']
            }).expect(400);
        
        expect(response.body.error).not.toBeNull();
    });

    test('OAUTH_SUITE - Should NOT register a client - invalid scope', async () => {
        const response = await request(app)
            .post('/oauth/register')
            .send({
                redirect_uris: [REDIRECT_URI],
                scope: 'config:write'
            }).expect(400);
        
        expect(response.body.error).not.toBeNull();
    });

    test('OAUTH_SUITE - Should NOT register a client - invalid redirect_uri', async () => {
        const response = await request(app)
            .post('/oauth/register')
            .send({
                redirect_uris: ['ftp://not-allowed.example.com/callback']
            }).expect(400);
        
        expect(response.body.error).not.toBeNull();
    });

    test('OAUTH_SUITE - Should NOT register a client - malformed redirect_uri', async () => {
        const response = await request(app)
            .post('/oauth/register')
            .send({
                redirect_uris: ['not-a-valid-url']
            }).expect(400);

        expect(response.body.error).not.toBeNull();
    });

    test('OAUTH_SUITE - Should NOT register a client - redirect_uri containing a fragment', async () => {
        const response = await request(app)
            .post('/oauth/register')
            .send({
                redirect_uris: ['https://example.com/callback#fragment']
            }).expect(400);

        expect(response.body.error).not.toBeNull();
    });
});

describe('Testing OAuth Authorization Code flow', () => {
    let clientId;

    beforeAll(async () => {
        await setupDatabase();
        const client = await registerClient();
        clientId = client.client_id;
    });

    test('OAUTH_SUITE - Should NOT authorize - unauthenticated', async () => {
        const response = await request(app)
            .get('/oauth/authorize')
            .query({
                response_type: 'code',
                client_id: clientId,
                redirect_uri: REDIRECT_URI,
                code_challenge: 'challenge',
                code_challenge_method: 'S256'
            })
            .send().expect(401);

        expect(response.body.error).not.toBeNull();
    });

    test('OAUTH_SUITE - Should NOT authorize - invalid client_id', async () => {
        const response = await request(app)
            .get('/oauth/authorize')
            .query({
                response_type: 'code',
                client_id: 'UNKNOWN_CLIENT_ID',
                redirect_uri: REDIRECT_URI,
                code_challenge: 'challenge',
                code_challenge_method: 'S256'
            })
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(400);
        
        expect(response.body.error).not.toBeNull();
    });

    test('OAUTH_SUITE - Should NOT authorize - redirect_uri not registered', async () => {
        const response = await request(app)
            .get('/oauth/authorize')
            .query({
                response_type: 'code',
                client_id: clientId,
                redirect_uri: 'http://127.0.0.1:9999/other-callback',
                code_challenge: 'challenge',
                code_challenge_method: 'S256'
            })
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(400);
        
        expect(response.body.error).not.toBeNull();
    });

    test('OAUTH_SUITE - Should redirect with access_denied - consent refused', async () => {
        const response = await request(app)
            .get('/oauth/authorize')
            .query({
                response_type: 'code',
                client_id: clientId,
                redirect_uri: REDIRECT_URI,
                code_challenge: 'challenge',
                code_challenge_method: 'S256',
                state: 'xyz',
                consent: 'false'
            })
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(302);

        const location = new URL(response.headers.location);
        expect(location.searchParams.get('error')).toEqual('access_denied');
        expect(location.searchParams.get('state')).toEqual('xyz');
    });

    test('OAUTH_SUITE - Should redirect with invalid_request - missing code_challenge', async () => {
        const response = await request(app)
            .get('/oauth/authorize')
            .query({
                response_type: 'code',
                client_id: clientId,
                redirect_uri: REDIRECT_URI,
                consent: 'true'
            })
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(302);

        const location = new URL(response.headers.location);
        expect(location.searchParams.get('error')).toEqual('invalid_request');
    });

    test('OAUTH_SUITE - Should redirect with invalid_request - unsupported response_type', async () => {
        const response = await request(app)
            .get('/oauth/authorize')
            .query({
                response_type: 'token',
                client_id: clientId,
                redirect_uri: REDIRECT_URI,
                code_challenge: 'challenge',
                code_challenge_method: 'S256',
                consent: 'true'
            })
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(302);

        const location = new URL(response.headers.location);
        expect(location.searchParams.get('error')).toEqual('invalid_request');
    });

    test('OAUTH_SUITE - Should redirect with invalid_request - unsupported code_challenge_method', async () => {
        const response = await request(app)
            .get('/oauth/authorize')
            .query({
                response_type: 'code',
                client_id: clientId,
                redirect_uri: REDIRECT_URI,
                code_challenge: 'challenge',
                code_challenge_method: 'plain',
                consent: 'true'
            })
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(302);

        const location = new URL(response.headers.location);
        expect(location.searchParams.get('error')).toEqual('invalid_request');
    });

    test('OAUTH_SUITE - Should redirect with an authorization code - consent granted', async () => {
        const { codeChallenge } = buildPkcePair();

        const response = await request(app)
            .get('/oauth/authorize')
            .query({
                response_type: 'code',
                client_id: clientId,
                redirect_uri: REDIRECT_URI,
                scope: 'config:read',
                state: 'state-abc',
                code_challenge: codeChallenge,
                code_challenge_method: 'S256',
                consent: 'true'
            })
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(302);

        const location = new URL(response.headers.location);
        expect(location.searchParams.get('code')).toEqual(expect.any(String));
        expect(location.searchParams.get('state')).toEqual('state-abc');

        const storedCode = await OAuthAuthorizationCode.findOne({
            code: location.searchParams.get('code')
        }).exec();
        expect(storedCode).not.toBeNull();
        expect(String(storedCode.admin)).toEqual(String(adminMasterAccountId));
    });
});

describe('Testing OAuth Authorization Code flow - JSON response mode', () => {
    let clientId;

    beforeAll(async () => {
        await setupDatabase();
        const client = await registerClient();
        clientId = client.client_id;
    });

    test('OAUTH_SUITE - Should return the redirect_uri as JSON instead of a 302 - consent granted', async () => {
        const { codeChallenge } = buildPkcePair();

        const response = await request(app)
            .get('/oauth/authorize')
            .query({
                response_type: 'code',
                client_id: clientId,
                redirect_uri: REDIRECT_URI,
                scope: 'config:read',
                state: 'state-json-abc',
                code_challenge: codeChallenge,
                code_challenge_method: 'S256',
                consent: 'true'
            })
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .set('Accept', 'application/json')
            .send().expect(200);

        expect(response.body.redirect_uri).toEqual(expect.any(String));

        const location = new URL(response.body.redirect_uri);
        expect(location.searchParams.get('code')).toEqual(expect.any(String));
        expect(location.searchParams.get('state')).toEqual('state-json-abc');

        const storedCode = await OAuthAuthorizationCode.findOne({
            code: location.searchParams.get('code')
        }).exec();
        expect(storedCode).not.toBeNull();
    });

    test('OAUTH_SUITE - Should return the redirect_uri as JSON instead of a 302 - consent refused', async () => {
        const response = await request(app)
            .get('/oauth/authorize')
            .query({
                response_type: 'code',
                client_id: clientId,
                redirect_uri: REDIRECT_URI,
                code_challenge: 'challenge',
                code_challenge_method: 'S256',
                state: 'state-json-denied',
                consent: 'false'
            })
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .set('Accept', 'application/json')
            .send().expect(200);

        const location = new URL(response.body.redirect_uri);
        expect(location.searchParams.get('error')).toEqual('access_denied');
        expect(location.searchParams.get('state')).toEqual('state-json-denied');
    });
});

describe('Testing OAuth token exchange', () => {
    let clientId;

    beforeAll(async () => {
        await setupDatabase();
        const client = await registerClient();
        clientId = client.client_id;
    });

    test('OAUTH_SUITE - Should exchange an authorization code for a token pair', async () => {
        const { token } = await authorizeAndExchange({ client_id: clientId });

        expect(token.access_token).toEqual(expect.any(String));
        expect(token.refresh_token).toEqual(expect.any(String));
        expect(token.token_type).toEqual('Bearer');
        expect(token.expires_in).toBeGreaterThan(0);
        expect(token.scope).toEqual('config:read');
    });

    test('OAUTH_SUITE - Should NOT exchange - unsupported grant_type', async () => {
        const response = await request(app)
            .post('/oauth/token')
            .send({
                grant_type: 'client_credentials',
                client_id: clientId
            }).expect(400);

        expect(response.body.error).toEqual('unsupported_grant_type');
    });

    test('OAUTH_SUITE - Should NOT exchange - missing required fields', async () => {
        const response = await request(app)
            .post('/oauth/token')
            .send({ grant_type: 'authorization_code' }).expect(422);
        
        expect(response.body.error).not.toBeNull();
    });

    test('OAUTH_SUITE - Should NOT exchange - invalid client_id', async () => {
        const response = await request(app)
            .post('/oauth/token')
            .send({
                grant_type: 'authorization_code',
                code: 'anything',
                redirect_uri: REDIRECT_URI,
                client_id: 'UNKNOWN_CLIENT_ID',
                code_verifier: 'verifier'
            }).expect(400);

        expect(response.body.error).toEqual('invalid_grant');
    });

    test('OAUTH_SUITE - Should NOT exchange - invalid code_verifier', async () => {
        const { codeChallenge } = buildPkcePair();
        const state = 'state-verifier';

        const authorizeResponse = await request(app)
            .get('/oauth/authorize')
            .query({
                response_type: 'code',
                client_id: clientId,
                redirect_uri: REDIRECT_URI,
                state,
                code_challenge: codeChallenge,
                code_challenge_method: 'S256',
                consent: 'true'
            })
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(302);

        const location = new URL(authorizeResponse.headers.location);
        const code = location.searchParams.get('code');

        const response = await request(app)
            .post('/oauth/token')
            .send({
                grant_type: 'authorization_code',
                code,
                redirect_uri: REDIRECT_URI,
                client_id: clientId,
                code_verifier: 'wrong-verifier'
            }).expect(400);

        expect(response.body.error).toEqual('invalid_grant');
    });

    test('OAUTH_SUITE - Should NOT exchange - authorization code already used', async () => {
        const { code, codeVerifier } = await (async () => {
            const pair = buildPkcePair();
            const authorizeResponse = await request(app)
                .get('/oauth/authorize')
                .query({
                    response_type: 'code',
                    client_id: clientId,
                    redirect_uri: REDIRECT_URI,
                    state: 'reuse',
                    code_challenge: pair.codeChallenge,
                    code_challenge_method: 'S256',
                    consent: 'true'
                })
                .set('Authorization', `Bearer ${adminMasterAccountToken}`)
                .send().expect(302);

            const location = new URL(authorizeResponse.headers.location);
            return { code: location.searchParams.get('code'), codeVerifier: pair.codeVerifier };
        })();

        await request(app)
            .post('/oauth/token')
            .send({
                grant_type: 'authorization_code',
                code,
                redirect_uri: REDIRECT_URI,
                client_id: clientId,
                code_verifier: codeVerifier
            }).expect(200);

        const response = await request(app)
            .post('/oauth/token')
            .send({
                grant_type: 'authorization_code',
                code,
                redirect_uri: REDIRECT_URI,
                client_id: clientId,
                code_verifier: codeVerifier
            }).expect(400);

        expect(response.body.error).toEqual('invalid_grant');
    });

    test('OAUTH_SUITE - Should NOT exchange - missing code_verifier', async () => {
        const { codeChallenge } = buildPkcePair();

        const authorizeResponse = await request(app)
            .get('/oauth/authorize')
            .query({
                response_type: 'code',
                client_id: clientId,
                redirect_uri: REDIRECT_URI,
                state: 'no-verifier',
                code_challenge: codeChallenge,
                code_challenge_method: 'S256',
                consent: 'true'
            })
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(302);

        const location = new URL(authorizeResponse.headers.location);
        const code = location.searchParams.get('code');

        const response = await request(app)
            .post('/oauth/token')
            .send({
                grant_type: 'authorization_code',
                code,
                redirect_uri: REDIRECT_URI,
                client_id: clientId
            }).expect(400);

        expect(response.body.error).toEqual('invalid_grant');
    });

    test('OAUTH_SUITE - Should NOT exchange - redirect_uri mismatch from authorization', async () => {
        const REDIRECT_URI_2 = 'http://127.0.0.1:8945/callback2';
        const client = await registerClient({ redirect_uris: [REDIRECT_URI, REDIRECT_URI_2] });
        const { codeChallenge, codeVerifier } = buildPkcePair();

        const authorizeResponse = await request(app)
            .get('/oauth/authorize')
            .query({
                response_type: 'code',
                client_id: client.client_id,
                redirect_uri: REDIRECT_URI,
                state: 'mismatch',
                code_challenge: codeChallenge,
                code_challenge_method: 'S256',
                consent: 'true'
            })
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(302);

        const location = new URL(authorizeResponse.headers.location);
        const code = location.searchParams.get('code');

        const response = await request(app)
            .post('/oauth/token')
            .send({
                grant_type: 'authorization_code',
                code,
                redirect_uri: REDIRECT_URI_2,
                client_id: client.client_id,
                code_verifier: codeVerifier
            }).expect(400);

        expect(response.body.error).toEqual('invalid_grant');
    });

    test('OAUTH_SUITE - Should NOT exchange - authorization code expired', async () => {
        const expiredCode = new OAuthAuthorizationCode({
            code: 'expired-code-value',
            client_id: clientId,
            admin: adminMasterAccountId,
            redirect_uri: REDIRECT_URI,
            scope: 'config:read',
            code_challenge: 'challenge',
            code_challenge_method: 'S256',
            expiresAt: new Date(Date.now() - 1000)
        });
        await expiredCode.save();

        const response = await request(app)
            .post('/oauth/token')
            .send({
                grant_type: 'authorization_code',
                code: 'expired-code-value',
                redirect_uri: REDIRECT_URI,
                client_id: clientId,
                code_verifier: 'verifier'
            }).expect(400);

        expect(response.body.error).toEqual('invalid_grant');
    });

    test('OAUTH_SUITE - Should refresh an access token and rotate the refresh token', async () => {
        const { token } = await authorizeAndExchange({ client_id: clientId });

        const refreshResponse = await request(app)
            .post('/oauth/token')
            .send({
                grant_type: 'refresh_token',
                client_id: clientId,
                refresh_token: token.refresh_token
            }).expect(200);

        expect(refreshResponse.body.access_token).toEqual(expect.any(String));
        expect(refreshResponse.body.access_token).not.toEqual(token.access_token);
        expect(refreshResponse.body.refresh_token).not.toEqual(token.refresh_token);

        // old refresh token must no longer be usable (rotation)
        const reuseResponse = await request(app)
            .post('/oauth/token')
            .send({
                grant_type: 'refresh_token',
                client_id: clientId,
                refresh_token: token.refresh_token
            }).expect(400);

        expect(reuseResponse.body.error).toEqual('invalid_grant');
    });

    test('OAUTH_SUITE - Should NOT refresh - invalid refresh_token', async () => {
        const response = await request(app)
            .post('/oauth/token')
            .send({
                grant_type: 'refresh_token',
                client_id: clientId,
                refresh_token: 'not-a-real-refresh-token'
            }).expect(400);

        expect(response.body.error).toEqual('invalid_grant');
    });

    test('OAUTH_SUITE - Should NOT refresh - missing refresh_token', async () => {
        const response = await request(app)
            .post('/oauth/token')
            .send({
                grant_type: 'refresh_token',
                client_id: clientId
            }).expect(400);

        expect(response.body.error).toEqual('invalid_grant');
    });

    test('OAUTH_SUITE - Should NOT refresh - refresh_token expired', async () => {
        const { token } = await authorizeAndExchange({ client_id: clientId });

        const expiredToken = await OAuthToken.findOne({ access_token: token.access_token }).exec();
        expiredToken.refreshTokenExpiresAt = new Date(Date.now() - 1000);
        await expiredToken.save();

        const response = await request(app)
            .post('/oauth/token')
            .send({
                grant_type: 'refresh_token',
                client_id: clientId,
                refresh_token: token.refresh_token
            }).expect(400);

        expect(response.body.error).toEqual('invalid_grant');
    });
});

describe('Testing protected resource access using an OAuth access token', () => {
    let clientId;
    let accessToken;

    beforeAll(async () => {
        await setupDatabase();
        const client = await registerClient();
        clientId = client.client_id;

        const { token } = await authorizeAndExchange({ client_id: clientId });
        accessToken = token.access_token;
    });

    test('OAUTH_SUITE - Should list domains using an OAuth access token', async () => {
        const response = await request(app)
            .get('/domain')
            .set('Authorization', `Bearer ${accessToken}`)
            .send().expect(200);

        expect(response.body.length).toEqual(1);
        expect(String(response.body[0]._id)).toEqual(String(domainId));
    });

    test('OAUTH_SUITE - Should list domain collaborations using an OAuth access token', async () => {
        const response = await request(app)
            .get('/domain/collaboration')
            .set('Authorization', `Bearer ${accessToken}`)
            .send().expect(200);
        
        expect(response.body.length).toEqual(0);
    });

    test('OAUTH_SUITE - Should list environments using an OAuth access token', async () => {
        const response = await request(app)
            .get(`/environment?domain=${domainId}`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send().expect(200);

        expect(response.body.length).toBeGreaterThan(0);
    });

    test('OAUTH_SUITE - Should get a Config by key using an OAuth access token', async () => {
        const response = await request(app)
            .get(`/config/key/${config1Document.key}?domain=Domain`)
            .set('Authorization', `Bearer ${accessToken}`)
            .send().expect(200);

        expect(response.body.key).toEqual(config1Document.key);
        expect(response.body.enabled).toEqual(true);
    });

    test('OAUTH_SUITE - Should NOT access protected resources with an invalid access token', async () => {
        const response = await request(app)
            .get('/domain')
            .set('Authorization', 'Bearer invalid-access-token')
            .send().expect(401);
        
        expect(response.body.error).not.toBeNull();
    });

    test('OAUTH_SUITE - Should NOT access protected resources when admin is not active', async () => {
        const inactiveAdminToken = new OAuthToken({
            access_token: crypto.randomBytes(32).toString('hex'),
            refresh_token: crypto.randomBytes(32).toString('hex'),
            client_id: clientId,
            admin: adminMasterAccountId,
            scope: 'config:read',
            accessTokenExpiresAt: new Date(Date.now() + 60000),
            refreshTokenExpiresAt: new Date(Date.now() + 60000)
        });
        await inactiveAdminToken.save();
        await Admin.findByIdAndUpdate(adminMasterAccountId, { active: false }).exec();

        const response = await request(app)
            .get('/domain')
            .set('Authorization', `Bearer ${inactiveAdminToken.access_token}`)
            .send().expect(401);

        expect(response.body.error).not.toBeNull();
    });

    test('OAUTH_SUITE - Should NOT access protected resources with an expired access token', async () => {
        const expiredToken = await OAuthToken.findOne({ access_token: accessToken }).exec();
        expiredToken.accessTokenExpiresAt = new Date(Date.now() - 1000);
        await expiredToken.save();

        const response = await request(app)
            .get('/domain')
            .set('Authorization', `Bearer ${accessToken}`)
            .send().expect(401);
        
        expect(response.body.error).not.toBeNull();
    });
});

describe('Testing OAuth authorized apps management', () => {
    let clientId;
    let clientName;

    beforeAll(async () => {
        await setupDatabase();
        const client = await registerClient({ client_name: 'Authorized Apps Client' });
        clientId = client.client_id;
        clientName = client.client_name;

        await authorizeAndExchange({ client_id: clientId });
    });

    test('OAUTH_SUITE - Should list authorized apps', async () => {
        const response = await request(app)
            .get('/oauth/authorized')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        expect(response.body).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    client_id: clientId,
                    client_name: clientName,
                    scope: 'config:read'
                })
            ])
        );
    });

    test('OAUTH_SUITE - Should NOT list authorized apps - unauthenticated', async () => {
        const response = await request(app)
            .get('/oauth/authorized')
            .send().expect(401);
        
        expect(response.body.error).not.toBeNull();
    });

    test('OAUTH_SUITE - Should revoke an authorized app', async () => {
        await request(app)
            .delete(`/oauth/authorized/${clientId}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        const response = await request(app)
            .get('/oauth/authorized')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        expect(response.body).not.toEqual(
            expect.arrayContaining([
                expect.objectContaining({ client_id: clientId })
            ])
        );
    });

    test('OAUTH_SUITE - Should NOT revoke an authorized app - not found', async () => {
        const response = await request(app)
            .delete('/oauth/authorized/UNKNOWN_CLIENT_ID')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(400);

        expect(response.body.error).not.toBeNull();
    });
});
