import mongoose from 'mongoose';
import request from 'supertest';
import { Client } from 'switcher-client';
import app from '../src/app';
import { EnvType } from '../src/models/environment';
import { 
    setupDatabase,
    domainId,
    adminMasterAccountToken 
} from './fixtures/db_client';

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
            .send(VALID_SUBSCRIPTION_REQUEST)
            .expect(400);

        expect(req.body.error).toBe('GitOps Integration is not available.');
    });
});

describe('GitOps Account - Subscribe', () => {
    beforeAll(setupDatabase);

    test('GITOPS_ACCOUNT_SUITE - Should subscribe account', async () => {
        await request(app)
            .post('/gitops/v1/account/subscribe')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(VALID_SUBSCRIPTION_REQUEST)
            .expect(201);
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