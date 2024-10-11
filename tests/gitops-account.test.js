import mongoose from 'mongoose';
import axios from 'axios';
import sinon from 'sinon';
import request from 'supertest';
import { Client } from 'switcher-client';
import app from '../src/app';
import { EnvType } from '../src/models/environment';
import { 
    setupDatabase,
    domainId,
    adminMasterAccountToken 
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

    test('GITOPS_ACCOUNT_SUITE - Should return error when feature is disabled', async () => {
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
        // given
        const expectedResponse = JSON.parse(JSON.stringify(VALID_SUBSCRIPTION_REQUEST));
        expectedResponse.token = '...123';

        const postStub = sinon.stub(axios, 'post').resolves({
            status: 201,
            data: expectedResponse
        });

        // test
        const req = await request(app)
            .post('/gitops/v1/account/subscribe')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(VALID_SUBSCRIPTION_REQUEST)
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
            .expect(500);

        // assert
        expect(req.body.error).toBe('Account subscription failed');
        postStub.restore();
    });

    test('GITOPS_ACCOUNT_SUITE - Should return error - missing domain.id', async () => {
        const payload = JSON.parse(JSON.stringify(VALID_SUBSCRIPTION_REQUEST));
        delete payload.domain.id;

        const req = await request(app)
            .post('/gitops/v1/account/subscribe')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(payload)
            .expect(422);

        expect(req.body.errors[0].msg).toBe('Invalid domain ID');
    });

    test('GITOPS_ACCOUNT_SUITE - Should return error - respository is not a valid URL', async () => {
        const payload = JSON.parse(JSON.stringify(VALID_SUBSCRIPTION_REQUEST));
        payload.repository = "invalid-url";

        const req = await request(app)
            .post('/gitops/v1/account/subscribe')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(payload)
            .expect(422);

        expect(req.body.errors[0].msg).toBe('Invalid repository URL');
    });

    test('GITOPS_ACCOUNT_SUITE - Should return error - window cannot be lower than 30s', async () => {
        const payload = JSON.parse(JSON.stringify(VALID_SUBSCRIPTION_REQUEST));
        payload.settings.window = "1s";

        const req = await request(app)
            .post('/gitops/v1/account/subscribe')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(payload)
            .expect(422);

        expect(req.body.errors[0].msg).toBe('Invalid window value (minimum 30s)');
    });

    test('GITOPS_ACCOUNT_SUITE - Should return error - window cannot use different units than [s,m,h]', async () => {
        const payload = JSON.parse(JSON.stringify(VALID_SUBSCRIPTION_REQUEST));
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
        const expectedResponse = JSON.parse(JSON.stringify(VALID_UPDATE_REQUEST));
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
        const payload = JSON.parse(JSON.stringify(VALID_UPDATE_REQUEST));
        delete payload.domain.id;

        const req = await request(app)
            .put('/gitops/v1/account')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(payload)
            .expect(422);

        expect(req.body.errors[0].msg).toBe('Invalid domain ID');
    });
    
})

describe('GitOps Account - Update Token', () => {
    beforeAll(setupDatabase);

    const VALID_UPDATE_REQUEST = {
        repository: 'https://github.com/switcherapi/switcher-gitops-fixture',
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

    const VALID_TOKEN_UPDATE_REQUEST = {
        environment: EnvType.DEFAULT,
        token: '123456',
        domain: {
            id: String(domainId)
        }
    };

    test('GITOPS_ACCOUNT_SUITE - Should update account token', async () => {
        // given
        const expectedResponse = JSON.parse(JSON.stringify(VALID_UPDATE_REQUEST));
        expectedResponse.token = '...123';

        const postStub = sinon.stub(axios, 'put').resolves({
            status: 200,
            data: expectedResponse
        });

        // test
        const req = await request(app)
            .put('/gitops/v1/account/token')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(VALID_TOKEN_UPDATE_REQUEST)
            .expect(200);

        // assert
        expect(req.body).toMatchObject(expectedResponse);
        postStub.restore();
    });

    test('GITOPS_ACCOUNT_SUITE - Should return error - error updating account token', async () => {
        // given
        const postStub = sinon.stub(axios, 'put').resolves({
            status: 500,
            data: {
                error: 'Error updating account token'
            }
        });

        // test
        const req = await request(app)
            .put('/gitops/v1/account/token')
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
            .put('/gitops/v1/account/token')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(VALID_TOKEN_UPDATE_REQUEST)
            .expect(500);

        // assert
        expect(req.body.error).toBe('Account token update failed');
        postStub.restore();
    });

    test('GITOPS_ACCOUNT_SUITE - Should return error - missing domain.id', async () => {
        const payload = JSON.parse(JSON.stringify(VALID_TOKEN_UPDATE_REQUEST));
        delete payload.domain.id;

        const req = await request(app)
            .put('/gitops/v1/account/token')
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
        const expectedResponse = JSON.parse(JSON.stringify(VALID_FORCE_SYNC_REQUEST));
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
        const payload = JSON.parse(JSON.stringify(VALID_FORCE_SYNC_REQUEST));
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
        const payload = JSON.parse(JSON.stringify(VALID_DELETE_REQUEST));
        delete payload.domain.id;

        const req = await request(app)
            .post('/gitops/v1/account/unsubscribe')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(payload)
            .expect(422);

        expect(req.body.errors[0].msg).toBe('Invalid domain ID');
    });

});