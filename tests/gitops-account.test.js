import mongoose from 'mongoose';
import axios from 'axios';
import sinon from 'sinon';
import request from 'supertest';
import { Client } from 'switcher-client';
import app from '../src/app';
import { Permission } from '../src/models/permission';
import { EnvType } from '../src/models/environment';
import { 
    setupDatabase,
    domainId,
    adminMasterAccountToken, 
    adminAccountToken,
    permissionAdminId
} from './fixtures/db_client';

afterAll(async () => { 
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mongoose.disconnect();
});

describe('GitOps Account - Feature Toggle', () => {
    beforeAll(async () => {
        await setupDatabase();
        process.env.SWITCHER_API_ENABLE = true;
        Client.assume('GITOPS_INTEGRATION').false();
    });

    afterAll(() => {
        process.env.SWITCHER_API_ENABLE = false;
    });

    test('GITOPS_ACCOUNT_SUITE - Should return error when feature is disabled - body domainId', async () => {
        const req = await request(app)
            .post('/gitops/v1/account/subscribe')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                repository: 'https://github.com/switcherapi/switcher-gitops-fixture',
                token: '{{github_pat}}',
                branch: 'main',
                environment: EnvType.DEFAULT,
                domain: {
                    id: String(domainId),
                    name: 'Test Domain'
                },
                settings: {
                    active: true,
                    window: '30s',
                    forceprune: true
                }	
            })
            .expect(400);

        expect(req.body.error).toBe('GitOps Integration is not available.');
    });

    test('GITOPS_ACCOUNT_SUITE - Should return error when feature is disabled - param domainId', async () => {
        const req = await request(app)
            .get(`/gitops/v1/account/${domainId}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .expect(400);
        
        expect(req.body.error).toBe('GitOps Integration is not available.');
    });
});

describe('GitOps Account - Forbidden', () => {
    beforeAll(async () => {
        await setupDatabase();

        // diable team permissions
        const permission = await Permission.findById(permissionAdminId);
        permission.active = false;
        await permission.save();
    });

    test('GITOPS_ACCOUNT_SUITE - Should not subscribe account - body.domain', async () => {
        const req = await request(app)
            .post('/gitops/v1/account/subscribe')
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .send({
                repository: 'https://github.com/switcherapi/switcher-gitops-fixture',
                token: '{{github_pat}}',
                branch: 'main',
                environment: EnvType.DEFAULT,
                domain: {
                    id: String(domainId),
                    name: 'Test Domain'
                },
                settings: {
                    active: true,
                    window: '30s',
                    forceprune: true
                }	
            })
            .expect(403);

        expect(req.body.error).toBe('Permission denied');
    });

    test('GITOPS_ACCOUNT_SUITE - Should not fetch all accounts by Domain ID - param.domain', async () => {
        const req = await request(app)
            .get(`/gitops/v1/account/${domainId}`)
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .expect(403);

        expect(req.body.error).toBe('Permission denied');
    });
});

describe('GitOps Account - Subscribe', () => {
    beforeAll(setupDatabase);

    const VALID_SUBSCRIPTION_REQUEST = {
        repository: 'https://github.com/switcherapi/switcher-gitops-fixture',
        token: '{{github_pat}}',
        branch: 'main',
        environment: EnvType.DEFAULT,
        domain: {
            id: String(domainId),
            name: 'Test Domain'
        },
        settings: {
            active: true,
            window: '30s',
            forceprune: true
        }	
    };

    test('GITOPS_ACCOUNT_SUITE - Should subscribe account', async () => {
        process.env.SWITCHER_API_ENABLE = true;
        Client.assume('GITOPS_INTEGRATION').true();
        Client.assume('GITOPS_SUBSCRIPTION').true();

        // given
        const expectedResponse = structuredClone(VALID_SUBSCRIPTION_REQUEST);
        expectedResponse.token = '...123';

        const postStub = sinon.stub(axios, 'post').resolves({
            status: 201,
            data: expectedResponse
        });

        // test
        const req = await request(app)
            .post('/gitops/v1/account/subscribe')
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .send(VALID_SUBSCRIPTION_REQUEST)
            .expect(201);

        // assert
        expect(req.body).toMatchObject(expectedResponse);

        postStub.restore();
        process.env.SWITCHER_API_ENABLE = false;
        Client.forget('GITOPS_INTEGRATION');
        Client.forget('GITOPS_SUBSCRIPTION');
    });

    
    test('GITOPS_ACCOUNT_SUITE - Should subscribe account - with blank path', async () => {
        // given
        const requestPayload = structuredClone(VALID_SUBSCRIPTION_REQUEST);
        requestPayload.path = '';

        const expectedResponse = structuredClone(requestPayload);
        expectedResponse.token = '...123';

        const postStub = sinon.stub(axios, 'post').resolves({
            status: 201,
            data: expectedResponse
        });

        // test
        const req = await request(app)
            .post('/gitops/v1/account/subscribe')
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .send(requestPayload)
            .expect(201);

        // assert
        expect(req.body).toMatchObject(expectedResponse);

        postStub.restore();
    });

    test('GITOPS_ACCOUNT_SUITE - Should return error - error creating account', async () => {
        // given
        const postStub = sinon.stub(axios, 'post').resolves({
            status: 500,
            data: {
                error: 'Error creating account'
            }
        });

        // test
        const req = await request(app)
            .post('/gitops/v1/account/subscribe')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(VALID_SUBSCRIPTION_REQUEST)
            .expect(500);

        // assert
        expect(req.body.error).toBe('Account subscription failed');
        postStub.restore();
    });

    test('GITOPS_ACCOUNT_SUITE - Should return error - unauthorized', async () => {
        // given
        const postStub = sinon.stub(axios, 'post').resolves({
            status: 401,
            data: {
                error: 'Invalid token'
            }
        });

        // test
        const req = await request(app)
            .post('/gitops/v1/account/subscribe')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(VALID_SUBSCRIPTION_REQUEST)
            .expect(401);

        // assert
        expect(req.body.error).toBe('Account subscription failed');
        postStub.restore();
    });

    test('GITOPS_ACCOUNT_SUITE - Should return error - missing domain.id', async () => {
        const payload = structuredClone(VALID_SUBSCRIPTION_REQUEST);
        delete payload.domain.id;

        const req = await request(app)
            .post('/gitops/v1/account/subscribe')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(payload)
            .expect(422);

        expect(req.body.errors[0].msg).toBe('Invalid domain ID');
    });

    test('GITOPS_ACCOUNT_SUITE - Should return error - respository is not a valid URL', async () => {
        const payload = structuredClone(VALID_SUBSCRIPTION_REQUEST);
        payload.repository = "invalid-url";

        const req = await request(app)
            .post('/gitops/v1/account/subscribe')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(payload)
            .expect(422);

        expect(req.body.errors[0].msg).toBe('Invalid repository URL');
    });

    test('GITOPS_ACCOUNT_SUITE - Should return error - window cannot be lower than 30s', async () => {
        const payload = structuredClone(VALID_SUBSCRIPTION_REQUEST);
        payload.settings.window = "1s";

        const req = await request(app)
            .post('/gitops/v1/account/subscribe')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(payload)
            .expect(422);

        expect(req.body.errors[0].msg).toBe('Invalid window value (minimum 30s)');
    });

    test('GITOPS_ACCOUNT_SUITE - Should return error - window cannot be lower than 1(m/h)', async () => {
        const payload = structuredClone(VALID_SUBSCRIPTION_REQUEST);
        payload.settings.window = "0m";

        const req = await request(app)
            .post('/gitops/v1/account/subscribe')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(payload)
            .expect(422);

        expect(req.body.errors[0].msg).toBe('Invalid window value (minimum 1[m/h])');
    });

    test('GITOPS_ACCOUNT_SUITE - Should return error - window cannot use different units than [s,m,h]', async () => {
        const payload = structuredClone(VALID_SUBSCRIPTION_REQUEST);
        payload.settings.window = '1d';

        const req = await request(app)
            .post('/gitops/v1/account/subscribe')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(payload)
            .expect(422);

        expect(req.body.errors[0].msg).toBe('Invalid window value');
    });
});

describe('GitOps Account - Update', () => {
    beforeAll(setupDatabase);

    const VALID_UPDATE_REQUEST = {
        repository: 'https://github.com/switcherapi/switcher-gitops-fixture',
        branch: 'main',
        environment: EnvType.DEFAULT,
        path: 'path/to/file',
        domain: {
            id: String(domainId),
            name: 'Test Domain'
        },
        settings: {
            active: true,
            window: '30s',
            forceprune: true
        }	
    };

    test('GITOPS_ACCOUNT_SUITE - Should update account', async () => {
        // given
        const expectedResponse = structuredClone(VALID_UPDATE_REQUEST);
        expectedResponse.token = '...123';

        const postStub = sinon.stub(axios, 'put').resolves({
            status: 200,
            data: expectedResponse
        });

        // test
        const req = await request(app)
            .put('/gitops/v1/account')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(VALID_UPDATE_REQUEST)
            .expect(200);

        // assert
        expect(req.body).toMatchObject(expectedResponse);
        postStub.restore();
    });

    test('GITOPS_ACCOUNT_SUITE - Should return error - error updating account', async () => {
        // given
        const postStub = sinon.stub(axios, 'put').resolves({
            status: 500,
            data: {
                error: 'Error updating account'
            }
        });

        // test
        const req = await request(app)
            .put('/gitops/v1/account')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(VALID_UPDATE_REQUEST)
            .expect(500);

        // assert
        expect(req.body.error).toBe('Account update failed');
        postStub.restore();
    });

    test('GITOPS_ACCOUNT_SUITE - Should return error - unauthorized', async () => {
        // given
        const postStub = sinon.stub(axios, 'put').resolves({
            status: 401,
            data: {
                error: 'Invalid token'
            }
        });

        // test
        const req = await request(app)
            .put('/gitops/v1/account')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(VALID_UPDATE_REQUEST)
            .expect(500);

        // assert
        expect(req.body.error).toBe('Account update failed');
        postStub.restore();
    });

    test('GITOPS_ACCOUNT_SUITE - Should return error - missing domain.id', async () => {
        const payload = structuredClone(VALID_UPDATE_REQUEST);
        delete payload.domain.id;

        const req = await request(app)
            .put('/gitops/v1/account')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(payload)
            .expect(422);

        expect(req.body.errors[0].msg).toBe('Invalid domain ID');
    });

    test('GITOPS_ACCOUNT_SUITE - Should return error - path uses invalid slashes', async () => {
        const payload = JSON.parse(JSON.stringify(VALID_UPDATE_REQUEST));
        
        // start with '/'
        payload.path = '/path/to/file';
        await request(app)
            .put('/gitops/v1/account')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(payload)
            .expect(422);

        // end with '/'
        payload.path = 'path/to/file/';
        await request(app)
            .put('/gitops/v1/account')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(payload)
            .expect(422);

        // contains '//'
        payload.path = 'path//to/file';
        const req = await request(app)
            .put('/gitops/v1/account')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(payload)
            .expect(422);

        expect(req.body.errors[0].msg).toBe('Invalid path value - cannot start or end with / or contain //');
    });

    test('GITOPS_ACCOUNT_SUITE - Should return error - path contains invalid characters', async () => {
        const payload = structuredClone(VALID_UPDATE_REQUEST);
        payload.path = 'path/to/file#';

        const req = await request(app)
            .put('/gitops/v1/account')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(payload)
            .expect(422);

        expect(req.body.errors[0].msg).toBe('Invalid path value - only alphanumeric characters and / are allowed');
    });
    
})

describe('GitOps Account - Update All Token', () => {
    beforeAll(setupDatabase);

    const VALID_TOKEN_UPDATE_REQUEST = {
        environments: [EnvType.DEFAULT],
        token: '123456',
        domain: {
            id: String(domainId)
        }
    };

    test('GITOPS_ACCOUNT_SUITE - Should update account tokens', async () => {
        const postStub = sinon.stub(axios, 'put').resolves({
            status: 200,
            data: {
                result: true,
                message: 'Account tokens updated successfully'
            }
        });

        // test
        const req = await request(app)
            .put('/gitops/v1/account/tokens')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(VALID_TOKEN_UPDATE_REQUEST)
            .expect(200);

        // assert
        expect(req.body).toMatchObject({
            result: true,
            message: 'Account tokens updated successfully'
        });
        postStub.restore();
    });

    test('GITOPS_ACCOUNT_SUITE - Should return error - error updating account tokens', async () => {
        // given
        const postStub = sinon.stub(axios, 'put').resolves({
            status: 500,
            data: {
                error: 'Error updating account token'
            }
        });

        // test
        const req = await request(app)
            .put('/gitops/v1/account/tokens')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(VALID_TOKEN_UPDATE_REQUEST)
            .expect(500);

        // assert
        expect(req.body.error).toBe('Account token update failed');
        postStub.restore();
    });

    test('GITOPS_ACCOUNT_SUITE - Should return error - unauthorized', async () => {
        // given
        const postStub = sinon.stub(axios, 'put').resolves({
            status: 401,
            data: {
                error: 'Invalid token'
            }
        });

        // test
        const req = await request(app)
            .put('/gitops/v1/account/tokens')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(VALID_TOKEN_UPDATE_REQUEST)
            .expect(500);

        // assert
        expect(req.body.error).toBe('Account token update failed');
        postStub.restore();
    });

    test('GITOPS_ACCOUNT_SUITE - Should return error - missing domain.id', async () => {
        const payload = structuredClone(VALID_TOKEN_UPDATE_REQUEST);
        delete payload.domain.id;

        const req = await request(app)
            .put('/gitops/v1/account/tokens')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(payload)
            .expect(422);

        expect(req.body.errors[0].msg).toBe('Invalid domain ID');
    });
});

describe('GitOps Account - Force sync', () => {
    beforeAll(setupDatabase);

    const VALID_FORCE_SYNC_REQUEST = {
        environment: EnvType.DEFAULT,
        domain: {
            id: String(domainId)
        }
    };

    test('GITOPS_ACCOUNT_SUITE - Should force sync account', async () => {
        // given
        const expectedResponse = structuredClone(VALID_FORCE_SYNC_REQUEST);
        expectedResponse.token = '...123';

        const postStub = sinon.stub(axios, 'put').resolves({
            status: 200,
            data: expectedResponse
        });

        // test
        const req = await request(app)
            .put('/gitops/v1/account/forcesync')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(VALID_FORCE_SYNC_REQUEST)
            .expect(200);

        // assert
        expect(req.body).toMatchObject(expectedResponse);
        postStub.restore();
    });

    test('GITOPS_ACCOUNT_SUITE - Should return error - error forcing sync account', async () => {
        // given
        const postStub = sinon.stub(axios, 'put').resolves({
            status: 500,
            data: {
                error: 'Error forcing sync account'
            }
        });

        // test
        const req = await request(app)
            .put('/gitops/v1/account/forcesync')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(VALID_FORCE_SYNC_REQUEST)
            .expect(500);

        // assert
        expect(req.body.error).toBe('Account force sync failed');
        postStub.restore();
    });

    test('GITOPS_ACCOUNT_SUITE - Should return error - unauthorized', async () => {
        // given
        const postStub = sinon.stub(axios, 'put').resolves({
            status: 401,
            data: {
                error: 'Invalid token'
            }
        });

        // test
        const req = await request(app)
            .put('/gitops/v1/account/forcesync')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(VALID_FORCE_SYNC_REQUEST)
            .expect(500);

        // assert
        expect(req.body.error).toBe('Account force sync failed');
        postStub.restore();
    });

    test('GITOPS_ACCOUNT_SUITE - Should return error - missing domain.id', async () => {
        const payload = structuredClone(VALID_FORCE_SYNC_REQUEST);
        delete payload.domain.id;

        const req = await request(app)
            .put('/gitops/v1/account/forcesync')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(payload)
            .expect(422);

        expect(req.body.errors[0].msg).toBe('Invalid domain ID');
    });
});

describe('GitOps Account - Unsubscribe', () => {
    beforeAll(setupDatabase);

    const VALID_DELETE_REQUEST = {
        environment: EnvType.DEFAULT,
        domain: {
            id: String(domainId)
        }
    };

    test('GITOPS_ACCOUNT_SUITE - Should subscribe account', async () => {
        // given
        const postStub = sinon.stub(axios, 'delete').resolves({
            status: 204,
            data: null
        });

        // test
        await request(app)
            .post(`/gitops/v1/account/unsubscribe`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(VALID_DELETE_REQUEST)
            .expect(200);

        postStub.restore();
    });

    test('GITOPS_ACCOUNT_SUITE - Should return error - error deleting account', async () => {
        // given
        const postStub = sinon.stub(axios, 'delete').resolves({
            status: 500,
            data: {
                error: 'Error deleting account'
            }
        });

        // test
        const req = await request(app)
            .post('/gitops/v1/account/unsubscribe')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(VALID_DELETE_REQUEST)
            .expect(500);

        // assert
        expect(req.body.error).toBe('Account unsubscription failed');
        postStub.restore();
    });

    test('GITOPS_ACCOUNT_SUITE - Should return error - unauthorized', async () => {
        // given
        const postStub = sinon.stub(axios, 'delete').resolves({
            status: 401,
            data: {
                error: 'Invalid token'
            }
        });

        // test
        const req = await request(app)
            .post('/gitops/v1/account/unsubscribe')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(VALID_DELETE_REQUEST)
            .expect(500);

        // assert
        expect(req.body.error).toBe('Account unsubscription failed');
        postStub.restore();
    });

    test('GITOPS_ACCOUNT_SUITE - Should return error - missing domain.id', async () => {
        const payload = structuredClone(VALID_DELETE_REQUEST);
        delete payload.domain.id;

        const req = await request(app)
            .post('/gitops/v1/account/unsubscribe')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(payload)
            .expect(422);

        expect(req.body.errors[0].msg).toBe('Invalid domain ID');
    });

});

describe('GitOps Account - Fetch Account(s)', () => {
    beforeAll(setupDatabase);

    const VALID_ACCOUNT_RESPONSE = {
        repository: 'https://github.com/switcherapi/switcher-gitops-fixture',
        token: '...123',
        branch: 'main',
        environment: EnvType.DEFAULT,
        domain: {
            id: String(domainId),
            name: 'Test Domain',
            version: 123456789,
            lastcommit: '123456789',
            lastupdate: new Date().toISOString(),
            status: 'Synced',
            message: 'Synced successfully'
        },
        settings: {
            active: true,
            window: '30s',
            forceprune: true
        }	
    };

    test('GITOPS_ACCOUNT_SUITE - Should fetch all accounts by Domain ID', async () => {
        // given
        const getStub = sinon.stub(axios, 'get').resolves({
            status: 200,
            data: [VALID_ACCOUNT_RESPONSE]
        });

        // test
        const req = await request(app)
            .get(`/gitops/v1/account/${domainId}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .expect(200);

        // assert
        expect(req.body).toMatchObject([VALID_ACCOUNT_RESPONSE]);
        getStub.restore();
    });

    test('GITOPS_ACCOUNT_SUITE - Should fetch single account by Domain ID and Environment', async () => {
        // given
        const getStub = sinon.stub(axios, 'get').resolves({
            status: 200,
            data: VALID_ACCOUNT_RESPONSE
        });

        // test
        const req = await request(app)
            .get(`/gitops/v1/account/${domainId}?environment=${EnvType.DEFAULT}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .expect(200);

        // assert
        expect(req.body).toMatchObject([VALID_ACCOUNT_RESPONSE]);
        getStub.restore();
    });

    test('GITOPS_ACCOUNT_SUITE - Should return error - error fetching accounts', async () => {
        // given
        const getStub = sinon.stub(axios, 'get').resolves({
            status: 500,
            data: {
                error: 'Error fetching accounts'
            }
        });

        // test
        const req = await request(app)
            .get(`/gitops/v1/account/${domainId}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .expect(500);

        // assert
        expect(req.body.error).toBe('Error fetching accounts');
        getStub.restore();
    });

    test('GITOPS_ACCOUNT_SUITE - Should return error - unauthorized', async () => {
        // given
        const getStub = sinon.stub(axios, 'get').resolves({
            status: 401,
            data: {
                error: 'Invalid token'
            }
        });

        // test
        const req = await request(app)
            .get(`/gitops/v1/account/${domainId}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .expect(500);

        // assert
        expect(req.body.error).toBe('Error fetching accounts');
        getStub.restore();
    });

    test('GITOPS_ACCOUNT_SUITE - Should return error - invalid domain ID', async () => {
        const req = await request(app)
            .get('/gitops/v1/account/invalid-id')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .expect(422);

        expect(req.body.errors[0].msg).toBe('Invalid domain ID');
    });

});