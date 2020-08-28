import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app';
import { Environment, EnvType } from '../src/models/environment';
import Domain from '../src/models/domain';
import GroupConfig from '../src/models/group-config';
import { Config } from '../src/models/config';
import { ConfigStrategy, StrategiesType, OperationsType } from '../src/models/config-strategy';
import { 
    setupDatabase,
    adminMasterAccountToken,
    adminAccountToken,
    environment1,
    environment1Id,
    domainId,
    groupConfigId,
    configId1,
    configStrategyId
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
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
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
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .send({
                name: 'QA',
                domain: domainId
            }).expect(401)
    })

    test('ENV_SUITE - Should NOT create a new Environment - Environment already exist', async () => {
        const response = await request(app)
            .post('/environment/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: EnvType.DEFAULT,
                domain: domainId
            }).expect(400)

        expect(response.body.error).toBe(`Unable to complete the operation. Environment '${EnvType.DEFAULT}' already exist for this Domain`)
    })

    test('ENV_SUITE - Should NOT create a new Environment - Domain not found', async () => {
        await request(app)
            .post('/environment/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'DEV',
                domain: 'FAKE_DOMAIN'
            }).expect(404)
    })
})

describe('Reading tests', () => {
    test('ENV_SUITE - Should read all Environments from a Domain', async () => {
        const response = await request(app)
            .get('/environment?domain=' + domainId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)

        const defaultEnv = response.body.filter(env => env.name === EnvType.DEFAULT)
        expect(defaultEnv[0].name).toBe(EnvType.DEFAULT)
    })

    test('ENV_SUITE - Should read one single Environment', async () => {
        const response = await request(app)
            .get('/environment/' + environment1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)

        expect(response.body.name).toBe(EnvType.DEFAULT)
    })

    test('ENV_SUITE - Should NOT read Environment - Not found', async () => {
        const response = await request(app)
            .get('/environment/NOT_FOUND')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(400)
    })
})

describe('Deletion tests', () => {
    beforeAll(setupDatabase)

    test('ENV_SUITE - Should delete an Environment', async () => {
        let response = await request(app)
            .post('/environment/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'QA',
                domain: domainId
            }).expect(201)

        response = await request(app)
            .delete('/environment/' + response.body._id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)

        // DB validation - document deleted
        const environment = await Environment.findById(response.body._id)
        expect(environment).toBeNull()
    })

    test('ENV_SUITE - Should NOT delete an Environment - default', async () => {
        const response = await request(app)
            .delete('/environment/' + environment1._id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(400)

        expect(response.body.error).toBe(`Unable to delete this environment`)
        
        // DB validation - document deleted
        const environment = await Environment.findById(environment1._id)
        expect(environment).not.toBeNull()
    })

    test('ENV_SUITE - Should NOT delete an Environment - Invalid Env Id', async () => {
        await request(app)
            .delete('/environment/INVALID_ID')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(400)
    })

    test('ENV_SUITE - Should NOT delete an Environment - Env not found', async () => {
        await request(app)
            .delete('/environment/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(404)
    })

    test('ENV_SUITE - Should NOT delete an Environment - Permission denied', async () => {
        let response = await request(app)
            .post('/environment/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'QA',
                domain: domainId
            }).expect(201)

        await request(app)
            .delete('/environment/' + response.body._id)
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .send().expect(401)
    })

    test('ENV_SUITE - Should recover an Environment', async () => {
        const envName = 'RecoverableEnvironment'
        let envId

        let response = await request(app)
            .post('/environment/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: envName,
                domain: domainId
            }).expect(201)

        envId = response.body._id

        await request(app)
            .patch('/domain/updateStatus/' + domainId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                [`${envName}`]: true
            }).expect(200);

        await request(app)
            .patch('/groupconfig/updateStatus/' + groupConfigId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                [`${envName}`]: true
            }).expect(200);

        await request(app)
            .patch('/config/updateStatus/' + configId1)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                [`${envName}`]: true
            }).expect(200);

        // Creates strategy for the environment test
        const strategyEnv = await request(app)
            .post('/configstrategy/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                description: 'Description of my new Config Strategy',
                strategy: StrategiesType.TIME,
                operation: OperationsType.GREATER,
                values: ['10:30'],
                config: configId1,
                env: envName
            }).expect(201)

        let domain = await Domain.findById(domainId)
        expect(domain.activated.get(EnvType.DEFAULT)).toEqual(true);
        expect(domain.activated.get(envName)).toEqual(true);

        let group = await GroupConfig.findById(groupConfigId)
        expect(group.activated.get(EnvType.DEFAULT)).toEqual(true);
        expect(group.activated.get(envName)).toEqual(true);

        let config = await Config.findById(configId1)
        expect(config.activated.get(EnvType.DEFAULT)).toEqual(true);
        expect(config.activated.get(envName)).toEqual(true);

        let strategy = await ConfigStrategy.findById(strategyEnv.body._id)
        expect(strategy.activated.get(envName)).toEqual(true);

        await request(app)
            .patch('/environment/recover/' + envId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)

        domain = await Domain.findById(domainId)
        expect(domain.activated.get(EnvType.DEFAULT)).toEqual(true);
        expect(domain.activated.get(envName)).toEqual(undefined);

        group = await GroupConfig.findById(groupConfigId)
        expect(group.activated.get(EnvType.DEFAULT)).toEqual(true);
        expect(group.activated.get(envName)).toEqual(undefined);

        config = await Config.findById(configId1)
        expect(config.activated.get(EnvType.DEFAULT)).toEqual(true);
        expect(config.activated.get(envName)).toEqual(undefined);

        strategy = await ConfigStrategy.findById(strategyEnv.body._id)
        expect(strategy).toBeNull();
    })

    test('ENV_SUITE - Should NOT recover an Environment - Invalid Env Id', async () => {
        await request(app)
            .patch('/environment/recover/INVALID_ID')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(400)
    })

    test('ENV_SUITE - Should NOT recover an Environment - Env not found', async () => {
        await request(app)
            .patch('/environment/recover/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(404)
    })
})