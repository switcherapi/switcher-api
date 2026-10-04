import '../../src/db/mongoose';

import mongoose from 'mongoose';
import sinon from 'sinon';
import {
    registerClient,
    createAuthorizationCode,
    exchangeAuthorizationCode
} from '../../src/services/oauth';
import { OAuthAuthorizationCode } from '../../src/models/oauth-authorization-code';
import { setupDatabase, adminMasterAccountId } from '../fixtures/db_api';

const REDIRECT_URI = 'https://example.com/callback';

afterAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mongoose.disconnect();
});

describe('Testing OAuth service - registerClient', () => {
    beforeEach(setupDatabase);

    // This branch is guarded by router-level validation (redirect_uris must have
    // at least 1 entry) and is unreachable via the API, so it is exercised here directly.
    test('OAUTH_SERVICE - Should NOT register a client - empty redirect_uris', async () => {
        await expect(registerClient({ redirect_uris: [] }))
            .rejects.toThrow('redirect_uris is required');
    });
});

describe('Testing OAuth service - createAuthorizationCode', () => {
    let client;

    beforeEach(async () => {
        await setupDatabase();
        client = await registerClient({
            client_name: 'Service Test Client',
            redirect_uris: [REDIRECT_URI]
        });
    });

    // The router pre-validates code_challenge/code_challenge_method before calling
    // this service function, so these branches are unreachable via the API.
    test('OAUTH_SERVICE - Should NOT create authorization code - missing code_challenge', async () => {
        await expect(createAuthorizationCode({
            client_id: client.client_id,
            admin: adminMasterAccountId,
            redirect_uri: REDIRECT_URI,
            code_challenge_method: 'S256'
        })).rejects.toThrow('Invalid code_challenge');
    });

    test('OAUTH_SERVICE - Should NOT create authorization code - unsupported code_challenge_method', async () => {
        await expect(createAuthorizationCode({
            client_id: client.client_id,
            admin: adminMasterAccountId,
            redirect_uri: REDIRECT_URI,
            code_challenge: 'challenge-value',
            code_challenge_method: 'plain'
        })).rejects.toThrow('Invalid code_challenge_method');
    });
});

describe('Testing OAuth service - exchangeAuthorizationCode', () => {
    let client;
    let findOneStub;

    beforeEach(async () => {
        await setupDatabase();
        client = await registerClient({
            client_name: 'Service Test Client',
            redirect_uris: [REDIRECT_URI]
        });
    });

    afterEach(() => {
        findOneStub?.restore();
    });

    // The OAuthAuthorizationCode schema enum only allows 'S256' for
    // code_challenge_method, so a stored code with any other value can only occur
    // from corrupted/legacy data - it can never be persisted through the model.
    // This branch is stubbed at the query layer to exercise that defensive check,
    // since it is otherwise unreachable via the API or a real database record.
    test('OAUTH_SERVICE - Should NOT exchange - stored code has unsupported code_challenge_method', async () => {
        const fakeAuthorizationCode = {
            used: false,
            redirect_uri: REDIRECT_URI,
            code_challenge: 'challenge-value',
            code_challenge_method: 'plain',
            scope: 'config:read',
            admin: adminMasterAccountId,
            expiresAt: new Date(Date.now() + 60000),
            save: sinon.stub().resolves()
        };

        findOneStub = sinon.stub(OAuthAuthorizationCode, 'findOne').returns({
            exec: sinon.stub().resolves(fakeAuthorizationCode)
        });

        await expect(exchangeAuthorizationCode({
            client_id: client.client_id,
            code: 'tampered-method-code',
            redirect_uri: REDIRECT_URI,
            code_verifier: 'verifier'
        })).rejects.toThrow('Invalid code_challenge_method');
    });
});
