import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app';
import bcrypt from 'bcrypt';
import Admin from '../src/models/admin';
import Domain from '../src/models/domain';
import GroupConfig from '../src/models/group-config';
import Config from '../src/models/config';
import { ConfigStrategy } from '../src/models/config-strategy';
import { EnvType, Environment } from '../src/models/environment';
import { 
    setupDatabase,
    adminMasterAccountId,
    adminMasterAccount,
    adminAccount,
    domainDocument,
    domainId,
    groupConfigId,
    configId1,
    configId2,
    configStrategyId,
    environment1Id
 } from './fixtures/db_api';

afterAll(async () => { 
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mongoose.disconnect()
})

describe('Testing Domain insertion', () => {
    beforeAll(setupDatabase)

    test('DOMAIN_SUITE - Should create a new Domain', async () => {
        const response = await request(app)
            .post('/domain/create')
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                name: 'New Domain',
                description: 'Description of my new Domain'
            }).expect(201)

        // DB validation - document created
        const domain = await Domain.findById(response.body.domain._id)
        expect(domain).not.toBeNull()

        // Response validation
        expect(response.body.domain.name).toBe('New Domain')
    })

    test('DOMAIN_SUITE - Should NOT create a new Domain - with no Master credential', async () => {
        const responseLogin = await request(app)
            .post('/admin/login')
            .send({
                email: adminAccount.email,
                password: adminAccount.password
            }).expect(200)

        const response = await request(app)
            .post('/domain/create')
            .set('Authorization', `Bearer ${responseLogin.body.token}`)
            .send({
                name: 'New Domain',
                description: 'Description of my new Domain'
            }).expect(400)

        expect(response.body.error).toEqual('Unable to create Domains without a Master Admin credential')
    })

    test('DOMAIN_SUITE - Should generate a valid API Key for a Domain', async () => {
        const response = await request(app)
            .get('/domain/generateApiKey/' + domainId)
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send().expect(201)

        expect(response.body.apiKey).not.toBeNull()

        // DB validation - current Domain token should not be as the same as the generated
        const domain = await Domain.findById(domainId)
        const isMatch = await bcrypt.compare(response.body.apiKey, domain.apihash)
        expect(isMatch).toBe(true)
    })

    test('DOMAIN_SUITE - Should NOT generate an API Key for a Domain - No Master Admin credential', async () => {
        const responseLogin = await request(app)
            .post('/admin/login')
            .send({
                email: adminAccount.email,
                password: adminAccount.password
            }).expect(200)

        await request(app)
            .get('/domain/generateApiKey/' + domainId)
            .set('Authorization', `Bearer ${responseLogin.body.token}`)
            .send().expect(400)
    })
})

describe('Testing fect Domain info', () => {
    beforeAll(setupDatabase)

    test('DOMAIN_SUITE - Should get Domain information', async () => {
        let response = await request(app)
            .get('/domain')
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send().expect(200)

        expect(response.body.length).toEqual(1)
        expect(response.body[0].activated[EnvType.DEFAULT]).toEqual(true);
        expect(String(response.body[0]._id)).toEqual(String(domainDocument._id))
        expect(response.body[0].name).toEqual(domainDocument.name)
        expect(String(response.body[0].owner)).toEqual(String(domainDocument.owner))
        expect(response.body[0].token).toEqual(domainDocument.token)

        // Adding new Domain
        response = await request(app)
            .post('/domain/create')
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                name: 'My New Domain',
                description: 'Description of my new Domain'
            }).expect(201)

        // DB validation - document created
        const domain = await Domain.findById(response.body.domain._id)
        expect(domain).not.toBeNull()

        response = await request(app)
            .get('/domain')
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send().expect(200)

        expect(response.body.length).toEqual(2)
    })

    test('DOMAIN_SUITE - Should get Domain information by Id', async () => {
        let response = await request(app)
            .get('/domain/' + domainId)
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send().expect(200)

        expect(String(response.body._id)).toEqual(String(domainDocument._id))
        expect(response.body.name).toEqual(domainDocument.name)
        expect(String(response.body.owner)).toEqual(String(domainDocument.owner))
        expect(response.body.token).toEqual(domainDocument.token)

        // Adding new Domain
        response = await request(app)
            .post('/domain/create')
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                name: 'New Domain 2',
                description: 'Description of my new Domain 2'
            }).expect(201)

        response = await request(app)
            .get('/domain/' + response.body.domain._id)
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send().expect(200)
    })

    test('DOMAIN_SUITE - Should NOT found Domain information by Id', async () => {
        await request(app)
            .get('/domain/' + domainId + 'NOTEXIST')
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send().expect(404)
    })

    test('DOMAIN_SUITE - Should delete Domain', async () => {
        const responseLogin = await request(app)
            .post('/admin/login')
            .send({
                email: adminMasterAccount.email,
                password: adminMasterAccount.password
            }).expect(200)

        // DB validation Before deleting
        let domain = await Domain.findById(domainId)
        expect(domain).not.toBeNull()

        let group = await GroupConfig.findById(groupConfigId)
        expect(group).not.toBeNull()

        let config1 = await Config.findById(configId1)
        expect(config1).not.toBeNull()

        let config2 = await Config.findById(configId2)
        expect(config2).not.toBeNull()

        let configStrategy = await ConfigStrategy.findById(configStrategyId)
        expect(configStrategy).not.toBeNull()

        let environment = await Environment.findById(environment1Id)
        expect(environment).not.toBeNull()

        await request(app)
            .delete('/domain/' + domainId)
            .set('Authorization', `Bearer ${responseLogin.body.token}`)
            .send().expect(200)

        const admin = await Admin.findById(adminMasterAccountId)
        expect(admin).not.toBeNull()

        // DB validation After - Verify deleted dependencies
        domain = await Domain.findById(domainId)
        expect(domain).toBeNull()

        group = await GroupConfig.findById(groupConfigId)
        expect(group).toBeNull()

        config1 = await Config.findById(configId1)
        expect(config1).toBeNull()

        config2 = await Config.findById(configId2)
        expect(config2).toBeNull()

        configStrategy = await ConfigStrategy.findById(configStrategyId)
        expect(configStrategy).toBeNull()

        environment = await Environment.findById(environment1Id)
        expect(environment).toBeNull()
    })

    test('DOMAIN_SUITE - Should NOT delete Domain', async () => {
        const responseLogin = await request(app)
            .post('/admin/login')
            .send({
                email: adminAccount.email,
                password: adminAccount.password
            }).expect(200)

        await request(app)
            .delete('/domain/' + domainId)
            .set('Authorization', `Bearer ${responseLogin.body.token}`)
            .send().expect(400)
    })
})

describe('Testing update Domain info', () => {
    beforeAll(setupDatabase)

    test('DOMAIN_SUITE - Should update Domain info', async () => {
        const oldQuery = await Domain.findById(domainId).select('description')

        await request(app)
            .patch('/domain/' + domainId)
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                description: 'Description updated'
            }).expect(200)
        
        // DB validation - verify description updated
        const newQuery = await Domain.findById(domainId).select('description')
        expect(oldQuery).not.toEqual(newQuery)
        expect(newQuery.description).toEqual('Description updated')
    })

    test('DOMAIN_SUITE - Should NOT update Domain info without Master credential', async () => {
        const responseLogin = await request(app)
            .post('/admin/login')
            .send({
                email: adminAccount.email,
                password: adminAccount.password
            }).expect(200)

        await new Promise(resolve => setTimeout(resolve, 1000));
        await request(app)
            .patch('/domain/' + domainId)
            .set('Authorization', `Bearer ${responseLogin.body.token}`)
            .send({
                description: 'Description updated'
            }).expect(400)
    })

    test('DOMAIN_SUITE - Should update Domain environment status - default', async () => {
        expect(domainDocument.activated.get(EnvType.DEFAULT)).toEqual(true);

        const response = await request(app)
            .patch('/domain/updateStatus/' + domainId)
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                default: false
            }).expect(200);

        expect(response.body.activated[EnvType.DEFAULT]).toEqual(false);

        // DB validation - verify status updated
        const domain = await Domain.findById(domainId)
        expect(domain.activated.get(EnvType.DEFAULT)).toEqual(false);
    })
})

describe('Testing environment configurations', () => {
    beforeAll(setupDatabase)

    test('DOMAIN_SUITE - Should update Domain environment status - QA', async () => {
        // QA Environment still does not exist
        expect(domainDocument.activated.get('QA')).toEqual(undefined);

        // Creating QA Environment...
        await request(app)
            .post('/environment/create')
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                name: 'QA',
                domain: domainId
            }).expect(201)

        const response = await request(app)
            .patch('/domain/updateStatus/' + domainId)
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                QA: true
            }).expect(200);

        expect(response.body.activated['QA']).toEqual(true);

        // DB validation - verify status updated
        let domain = await Domain.findById(domainId)
        expect(domain.activated.get(EnvType.DEFAULT)).toEqual(true);
        expect(domain.activated.get('QA')).toEqual(true);

        // Inactivating QA. Default environment should stay activated
        await request(app)
            .patch('/domain/updateStatus/' + domainId)
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                QA: false
            }).expect(200);

        domain = await Domain.findById(domainId)
        expect(domain.activated.get(EnvType.DEFAULT)).toEqual(true);
        expect(domain.activated.get('QA')).toEqual(false);
    })

    test('DOMAIN_SUITE - Should NOT update Domain environment status - Permission denied', async () => {
        await request(app)
            .patch('/domain/updateStatus/' + domainId)
            .set('Authorization', `Bearer ${adminAccount.tokens[0].token}`)
            .send({
                default: false
            }).expect(400);
    })

    test('DOMAIN_SUITE - Should NOT update Domain environment status - Domain not fould', async () => {
        await request(app)
            .patch('/domain/updateStatus/FAKE_DOMAIN')
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                default: false
            }).expect(400);
    })

    test('DOMAIN_SUITE - Should remove Domain environment status', async () => {
        // Creating QA Environment...
        await request(app)
            .post('/environment/create')
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                name: 'QA1',
                domain: domainId
            }).expect(201)
        
        await request(app)
            .patch('/domain/updateStatus/' + domainId)
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                QA1: true
            }).expect(200);

        let domain = await Domain.findById(domainId)
        expect(domain.activated.get('QA1')).toEqual(true);

        await request(app)
            .patch('/domain/removeStatus/' + domainId)
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                env: 'QA1'
            }).expect(200);

        // DB validation - verify status updated
        domain = await Domain.findById(domainId)
        expect(domain.activated.get('QA1')).toEqual(undefined);
    })

    test('DOMAIN_SUITE - Should NOT remove Domain environment status', async () => {
        // Creating QA3 Environment...
        await request(app)
            .post('/environment/create')
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                name: 'QA3',
                domain: domainId
            }).expect(201)

        await request(app)
            .patch('/domain/updateStatus/' + domainId)
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                QA3: true
            }).expect(200);

        // default environment cannot be removed
        await request(app)
            .patch('/domain/removeStatus/' + domainId)
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                env: EnvType.DEFAULT
            }).expect(400);
        
        // QA3 environment cannot be removed without permission
        await request(app)
            .patch('/domain/removeStatus/' + domainId)
            .set('Authorization', `Bearer ${adminAccount.tokens[0].token}`)
            .send({
                env: 'QA3'
            }).expect(400);

        // Domain does not exist
        await request(app)
            .patch('/domain/removeStatus/FAKE_DOMAIN')
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                env: 'QA3'
            }).expect(400);

        const domain = await Domain.findById(domainId)
        expect(domain.activated.get(EnvType.DEFAULT)).toEqual(true);
        expect(domain.activated.get('QA3')).toEqual(true);
    })
})