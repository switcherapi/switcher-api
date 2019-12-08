import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app';
import { Environment, EnvType } from '../src/models/environment';
import { 
    setupDatabase,
    adminMasterAccount,
    adminAccount,
    environment1,
    domainId
 } from './fixtures/db_api';

afterAll(async () => { 
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mongoose.disconnect()
})

describe('Insertion tests', () => {
    beforeAll(setupDatabase)

    test('ENV_SUITE - Should create a new Environment', async () => {
        const response = await request(app)
            .post('/environment/create')
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                name: 'QA',
                domain: domainId
            }).expect(201)

        // DB validation - document created
        const environment = await Environment.findById(response.body._id)
        expect(environment).not.toBeNull()

        // Response validation
        expect(response.body.name).toBe('QA')
    })

    test('ENV_SUITE - Should NOT create a new Environment - Permission denied', async () => {
        await request(app)
            .post('/environment/create')
            .set('Authorization', `Bearer ${adminAccount.tokens[0].token}`)
            .send({
                name: 'QA',
                domain: domainId
            }).expect(400)
    })

    test('ENV_SUITE - Should NOT create a new Environment - Environment already exist', async () => {
        const response = await request(app)
            .post('/environment/create')
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                name: EnvType.DEFAULT,
                domain: domainId
            }).expect(400)

        expect(response.body.error).toBe(`Unable to complete the operation. Environment '${EnvType.DEFAULT}' already exist for this Domain`)
    })

    test('ENV_SUITE - Should NOT create a new Environment - Domain not found', async () => {
        await request(app)
            .post('/environment/create')
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                name: 'DEV',
                domain: 'FAKE_DOMAIN'
            }).expect(400)
    })
})

describe('Deletion tests', () => {
    beforeAll(setupDatabase)

    test('ENV_SUITE - Should delete an Environment', async () => {
        let response = await request(app)
            .post('/environment/create')
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                name: 'QA',
                domain: domainId
            }).expect(201)

        response = await request(app)
            .delete('/environment/' + response.body._id)
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send().expect(200)

        // DB validation - document deleted
        const environment = await Environment.findById(response.body._id)
        expect(environment).toBeNull()
    })

    test('ENV_SUITE - Should NOT delete an Environment - default', async () => {
        const response = await request(app)
            .delete('/environment/' + environment1._id)
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send().expect(400)

        expect(response.body.error).toBe(`Unable to delete this environment`)
        
        // DB validation - document deleted
        const environment = await Environment.findById(environment1._id)
        expect(environment).not.toBeNull()
    })

    test('ENV_SUITE - Should NOT delete an Environment - Permission denied', async () => {
        let response = await request(app)
            .post('/environment/create')
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                name: 'QA',
                domain: domainId
            }).expect(201)

        await request(app)
            .delete('/environment/' + response.body._id)
            .set('Authorization', `Bearer ${adminAccount.tokens[0].token}`)
            .send().expect(400)
    })
})