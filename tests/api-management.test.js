import mongoose from 'mongoose';
import app from '../src/app';
import request from 'supertest';
import { 
    adminMasterAccount,
    setupDatabase
} from './fixtures/db_api';
import { Switcher } from 'switcher-client';

afterAll(async () => { 
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mongoose.disconnect();
});

describe('API Management', () => {

    let token;

    beforeAll(async () => {
        await setupDatabase();

        const res = await request(app)
            .post('/admin/login')
            .send({
                email: adminMasterAccount.email,
                password: adminMasterAccount.password
            }).expect(200);

        token = res.body.jwt.token;
    });

    beforeEach(async () => {
        process.env.SWITCHER_API_ENABLE = true;
        Switcher.forget('MY_FEATURE');
    });

    test('API_MANAGEMENT - Should return TRUE when SWITCHER_API_ENABLE disabled', async () => {
        process.env.SWITCHER_API_ENABLE = false;
        
        const res = await request(app)
            .post('/api-management/feature')
            .set('Authorization', `Bearer ${token}`)
            .send({
                feature: 'MY_FEATURE'
            }).expect(200);

        expect(res.body.status).toEqual(true);
    });

    test('API_MANAGEMENT - Should return TRUE when requesting feature `MY_FEATURE`', async () => {
        Switcher.assume('MY_FEATURE').true();
        
        const res = await request(app)
            .post('/api-management/feature')
            .set('Authorization', `Bearer ${token}`)
            .send({
                feature: 'MY_FEATURE'
            }).expect(200);

        expect(res.body.status).toEqual(true);
    });

    test('API_MANAGEMENT - Should return TRUE when requesting feature `MY_FEATURE` with parameters - value', async () => {
        Switcher.assume('MY_FEATURE').false();
        
        const res = await request(app)
            .post('/api-management/feature')
            .set('Authorization', `Bearer ${token}`)
            .send({
                feature: 'MY_FEATURE',
                parameters: {
                    value: 'my-value'
                }
            }).expect(200);
            
        expect(res.body.status).toEqual(false);
    });

    test('API_MANAGEMENT - Should NOT return when body has invalid payload', async () => {
        await request(app)
            .post('/api-management/feature')
            .set('Authorization', `Bearer ${token}`)
            .send({
                features: ['MY_FEATURE']
            }).expect(400);
    });

    test('API_MANAGEMENT - Should NOT return when API cannot respond', async () => {
        await request(app)
            .post('/api-management/feature')
            .set('Authorization', `Bearer ${token}`)
            .send({
                feature: 'MY_FEATURE_1'
            }).expect(400);
    });

    test('API_MANAGEMENT - Should NOT return when feature not specified', async () => {
        await request(app)
            .post('/api-management/feature')
            .set('Authorization', `Bearer ${token}`)
            .send().expect(422);
    });

    test('API_MANAGEMENT - Should NOT return when paramaters is not an object', async () => {
        await request(app)
            .post('/api-management/feature')
            .set('Authorization', `Bearer ${token}`)
            .send({
                feature: 'MY_FEATURE',
                parameters: 'my-value'
            }).expect(422);
    });
        
    test('API_MANAGEMENT - Should NOT return when not logged', async () => {
        await request(app)
            .post('/api-management/feature')
            .send({
                feature: 'MY_FEATURE'
            }).expect(401);
    });

});