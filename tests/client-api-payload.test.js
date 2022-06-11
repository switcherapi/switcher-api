import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app';
import { StrategiesType } from '../src/models/config-strategy';
import { EnvType } from '../src/models/environment';
import { 
    setupDatabase,
    apiKey,
    domainDocument,
    component1,
    keyConfigPayload
} from './fixtures/db_client_payload';

const createRequestAuth = async () => {
    return request(app)
        .post('/criteria/auth')
        .set('switcher-api-key', `${apiKey}`)
        .send({
            domain: domainDocument.name,
            component: component1.name,
            environment: EnvType.DEFAULT
        });
};

beforeAll(setupDatabase);

afterAll(async () => { 
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mongoose.disconnect();
});

describe('Testing criteria [REST] ', () => {
    let token;

    beforeAll(async () => {
        const response = await createRequestAuth();
        token = response.body.token;
    });

    test('CLIENT_SUITE - Should return success on a payload-entry-based CRITERIA request', async () => {
        const req = await request(app)
            .post(`/criteria?key=${keyConfigPayload}&showReason=true&showStrategy=true`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                entry: [
                    {
                        strategy: StrategiesType.PAYLOAD,
                        input: '{ "username": "USER_1" }'
                    }
                ]})
            .expect(200);

        expect(req.statusCode).toBe(200);
        expect(req.body.reason).toEqual('Success');
        expect(req.body.result).toBe(true);
    });

    test('CLIENT_SUITE - Should return success on a nested payload-entry-based CRITERIA request', async () => {
        const req = await request(app)
            .post(`/criteria?key=${keyConfigPayload}&showReason=true&showStrategy=true`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                entry: [
                    {
                        strategy: StrategiesType.PAYLOAD,
                        input: '{ "username": "USER_1", "login": { "status": "activated" } }'
                    }
                ]})
            .expect(200);

        expect(req.statusCode).toBe(200);
        expect(req.body.reason).toEqual('Success');
        expect(req.body.result).toBe(true);
    });

    test('CLIENT_SUITE - Should return error on a payload-entry-based CRITERIA request - object input', async () => {
        await request(app)
            .post(`/criteria?key=${keyConfigPayload}&showReason=true&showStrategy=true`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                entry: [
                    {
                        strategy: StrategiesType.PAYLOAD,
                        input: { username: 'USER_1' }
                    }
                ]})
            .expect(422);
    });

    test('CLIENT_SUITE - Should return false on an invalid payload-entry-based CRITERIA request', async () => {
        const req = await request(app)
            .post(`/criteria?key=${keyConfigPayload}&showReason=true&showStrategy=true`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                entry: [
                    {
                        strategy: StrategiesType.PAYLOAD,
                        input: '{ "user": "USER_1" }'
                    }
                ]})
            .expect(200);

        expect(req.statusCode).toBe(200);
        expect(req.body.reason).toEqual(`Strategy '${StrategiesType.PAYLOAD}' does not agree`);
        expect(req.body.result).toBe(false);
    });

});