import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app';
import Admin from '../src/models/admin';
import Domain from '../src/models/domain';
import GroupConfig from '../src/models/group-config';
import Config from '../src/models/config';
import History from '../src/models/history';
import { EnvType } from '../src/models/environment';
import { ConfigStrategy, StrategiesType, OperationsType, strategyRequirements } from '../src/models/config-strategy';
import { 
    setupDatabase,
    adminMasterAccountId,
    adminMasterAccount,
    adminAccount,
    domainId,
    groupConfigId,
    configId1,
    configId2,
    configStrategyId,
    configStrategyDocument
 } from './fixtures/db_api';

afterAll(async () => { 
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mongoose.disconnect()
})

describe('Testing strategy creation #1', () => {
    beforeAll(setupDatabase)

    test('STRATEGY_SUITE - Should create a new Config Strategy', async () => {
        const response = await request(app)
            .post('/configstrategy/create')
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                description: 'Description of my new Config Strategy',
                strategy: StrategiesType.NETWORK,
                operation: OperationsType.EQUAL,
                values: ['192.168.0.1/16'],
                config: configId2,
                env: EnvType.DEFAULT
            }).expect(201)

        // DB validation - document created
        const configStrategy = await ConfigStrategy.findById(response.body._id)
        expect(configStrategy).not.toBeNull()

        // Response validation
        expect(response.body.description).toBe('Description of my new Config Strategy')
    })

    test('STRATEGY_SUITE - Should NOT create a new Config Strategy - Config not found', async () => {
        const response = await request(app)
            .post('/configstrategy/create')
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                description: 'Description of my new Config Strategy',
                strategy: StrategiesType.NETWORK,
                operation: OperationsType.EQUAL,
                values: ['192.168.0.1/16'],
                config: new mongoose.Types.ObjectId(),
                env: EnvType.DEFAULT
            }).expect(404)

        expect(response.body.error).toBe('Config not found')
    })

    test('STRATEGY_SUITE - Should NOT create a new Config Strategy - Environment not found', async () => {
        const response = await request(app)
            .post('/configstrategy/create')
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                description: 'Description of my new Config Strategy',
                strategy: StrategiesType.NETWORK,
                operation: OperationsType.EQUAL,
                values: ['192.168.0.1/16'],
                config: configId1,
                env: 'INVALID_ENVIRONMENT'
            }).expect(400)

        expect(response.body.error).toBe('Environment does not exist')
    })

    test('STRATEGY_SUITE - Should NOT create a new Config Strategy - Duplicated Strategy at the same configuration', async () => {
        const response = await request(app)
            .post('/configstrategy/create')
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                description: 'Description of my new Config Strategy',
                strategy: StrategiesType.VALUE,
                operation: OperationsType.EQUAL,
                values: ['USER_1'],
                config: configId1,
                env: EnvType.DEFAULT
            }).expect(400)

        expect(response.body.error).toBe(`Unable to complete the operation. Strategy '${StrategiesType.VALUE}' already exist for this configuration`)
    })

    test('STRATEGY_SUITE - Should NOT create a new Config Strategy - Wrong operation and strategies', async () => {
        await request(app)
            .post('/configstrategy/create')
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                description: 'Description of my new Config Strategy',
                strategy: 'WRONG_STRATEGY',
                operation: OperationsType.EQUAL,
                values: ['192.168.0.1/16'],
                config: configId2
            }).expect(400)

        await request(app)
            .post('/configstrategy/create')
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                description: 'Description of my new Config Strategy',
                strategy: StrategiesType.NETWORK,
                operation: 'WORNG_OPERATION',
                values: ['192.168.0.1/16'],
                config: configId2
            }).expect(400)
    })
})

describe('Testing strategy creation #2', () => {
    beforeAll(setupDatabase)

    test('STRATEGY_SUITE - Should NOT create a new Config Strategy - Number of values incorret', async () => {
        
        // VALUE
        let requirements = strategyRequirements(StrategiesType.VALUE)
        let { max, min } = requirements.operationRequirements.filter(element => element.operation === OperationsType.EQUAL)[0]

        let response = await request(app)
            .post('/configstrategy/create')
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                description: 'Description of my new Config Strategy',
                strategy: StrategiesType.VALUE,
                operation: OperationsType.EQUAL,
                values: ['USER_1', 'USER_2'],
                config: configId2,
                env: EnvType.DEFAULT
            }).expect(400)

        expect(response.body.error).toBe(`Unable to complete the operation. The number of values for the operation '${OperationsType.EQUAL}', are min: ${min} and max: ${max} values`);

        ({ max, min } = requirements.operationRequirements.filter(element => element.operation === OperationsType.EXIST)[0]);
        response = await request(app)
            .post('/configstrategy/create')
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                description: 'Description of my new Config Strategy',
                strategy: StrategiesType.VALUE,
                operation: OperationsType.EXIST,
                values: [],
                config: configId2,
                env: EnvType.DEFAULT
            }).expect(400)

        expect(response.body.error).toBe(`Unable to complete the operation. The number of values for the operation '${OperationsType.EXIST}', are min: ${min} and max: ${max} values`);
        
        // NETWORK
        requirements = strategyRequirements(StrategiesType.NETWORK);
        ({ max, min } = requirements.operationRequirements.filter(element => element.operation === OperationsType.EXIST)[0]);

        response = await request(app)
            .post('/configstrategy/create')
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                description: 'Description of my new Config Strategy',
                strategy: StrategiesType.NETWORK,
                operation: OperationsType.EXIST,
                values: [],
                config: configId2,
                env: EnvType.DEFAULT
            }).expect(400)

        expect(response.body.error).toBe(`Unable to complete the operation. The number of values for the operation '${OperationsType.EXIST}', are min: ${min} and max: ${max} values`);
        
        // TIME
        requirements = strategyRequirements(StrategiesType.TIME);
        ({ max, min } = requirements.operationRequirements.filter(element => element.operation === OperationsType.GREATER)[0]);

        response = await request(app)
            .post('/configstrategy/create')
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                description: 'Description of my new Config Strategy',
                strategy: StrategiesType.TIME,
                operation: OperationsType.GREATER,
                values: ['2:00', '4:00'],
                config: configId2,
                env: EnvType.DEFAULT
            }).expect(400)

        expect(response.body.error).toBe(`Unable to complete the operation. The number of values for the operation '${OperationsType.GREATER}', are min: ${min} and max: ${max} values`);
        
        ({ max, min } = requirements.operationRequirements.filter(element => element.operation === OperationsType.LOWER)[0]);

        response = await request(app)
            .post('/configstrategy/create')
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                description: 'Description of my new Config Strategy',
                strategy: StrategiesType.TIME,
                operation: OperationsType.LOWER,
                values: ['2:00', '4:00'],
                config: configId2,
                env: EnvType.DEFAULT
            }).expect(400)

        expect(response.body.error).toBe(`Unable to complete the operation. The number of values for the operation '${OperationsType.LOWER}', are min: ${min} and max: ${max} values`);
        
        ({ max, min } = requirements.operationRequirements.filter(element => element.operation === OperationsType.BETWEEN)[0]);

        response = await request(app)
            .post('/configstrategy/create')
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                description: 'Description of my new Config Strategy',
                strategy: StrategiesType.TIME,
                operation: OperationsType.BETWEEN,
                values: ['2:00'],
                config: configId2,
                env: EnvType.DEFAULT
            }).expect(400)

        expect(response.body.error).toBe(`Unable to complete the operation. The number of values for the operation '${OperationsType.BETWEEN}', are min: ${min} and max: ${max} values`);

        // DATE
        requirements = strategyRequirements(StrategiesType.DATE);
        ({ max, min } = requirements.operationRequirements.filter(element => element.operation === OperationsType.GREATER)[0]);

        response = await request(app)
            .post('/configstrategy/create')
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                description: 'Description of my new Config Strategy',
                strategy: StrategiesType.DATE,
                operation: OperationsType.GREATER,
                values: ['2019-12-12', '2019-12-20'],
                config: configId2,
                env: EnvType.DEFAULT
            }).expect(400)

        expect(response.body.error).toBe(`Unable to complete the operation. The number of values for the operation '${OperationsType.GREATER}', are min: ${min} and max: ${max} values`);
        
        ({ max, min } = requirements.operationRequirements.filter(element => element.operation === OperationsType.LOWER)[0]);

        response = await request(app)
            .post('/configstrategy/create')
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                description: 'Description of my new Config Strategy',
                strategy: StrategiesType.DATE,
                operation: OperationsType.LOWER,
                values: ['2019-12-12', '2019-12-20'],
                config: configId2,
                env: EnvType.DEFAULT
            }).expect(400)

        expect(response.body.error).toBe(`Unable to complete the operation. The number of values for the operation '${OperationsType.LOWER}', are min: ${min} and max: ${max} values`);
        
        ({ max, min } = requirements.operationRequirements.filter(element => element.operation === OperationsType.BETWEEN)[0]);

        response = await request(app)
            .post('/configstrategy/create')
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                description: 'Description of my new Config Strategy',
                strategy: StrategiesType.DATE,
                operation: OperationsType.BETWEEN,
                values: ['2019-12-12'],
                config: configId2,
                env: EnvType.DEFAULT
            }).expect(400)

        expect(response.body.error).toBe(`Unable to complete the operation. The number of values for the operation '${OperationsType.BETWEEN}', are min: ${min} and max: ${max} values`);

    })
})

describe('Testing reading strategies #1', () => {
    beforeAll(setupDatabase)

    test('STRATEGY_SUITE - Should get Config Strategy information', async () => {
        let response = await request(app)
            .get('/configstrategy?config=' + configId1)
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send().expect(200)

        expect(response.body.length).toEqual(1)

        expect(String(response.body[0]._id)).toEqual(String(configStrategyDocument._id))
        expect(response.body[0].strategy).toEqual(configStrategyDocument.strategy)
        expect(response.body[0].operation).toEqual(configStrategyDocument.operation)
        expect(String(response.body[0].owner)).toEqual(String(configStrategyDocument.owner))
        expect(response.body[0].activated[EnvType.DEFAULT]).toEqual(configStrategyDocument.activated.get(EnvType.DEFAULT))

        // Adding new Config Strategy
        response = await request(app)
            .post('/configstrategy/create')
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                description: 'Description of my new Config Strategy',
                strategy: StrategiesType.NETWORK,
                operation: OperationsType.EQUAL,
                values: ['192.168.0.1/16'],
                config: configId1,
                env: EnvType.DEFAULT
            }).expect(201)

        // DB validation - document created
        const configStrategy = await ConfigStrategy.findById(response.body._id)
        expect(configStrategy).not.toBeNull()

        response = await request(app)
            .get('/configstrategy?config=' + configId1)
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send().expect(200)

        expect(response.body.length).toEqual(2)
    })

    test('STRATEGY_SUITE - Should NOT get Config Strategy information - Invalid Config Id', async () => {
        await request(app)
            .get('/configstrategy?config=' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send().expect(404)

        await request(app)
            .get('/configstrategy?config=INVALID_ID_VALUE')
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send().expect(500)
    })
})

describe('Testing reading strategies #2', () => {
    beforeAll(setupDatabase)

    test('STRATEGY_SUITE - Should get Config Strategy information by Id', async () => {
        let response = await request(app)
            .get('/configstrategy/' + configStrategyId)
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send().expect(200)

        expect(String(response.body._id)).toEqual(String(configStrategyDocument._id))
        expect(response.body.strategy).toEqual(configStrategyDocument.strategy)
        expect(response.body.operation).toEqual(configStrategyDocument.operation)
        expect(String(response.body.owner)).toEqual(String(configStrategyDocument.owner))
        expect(response.body.activated[EnvType.DEFAULT]).toEqual(configStrategyDocument.activated.get(EnvType.DEFAULT))

        // Adding new Config Strategy
        response = await request(app)
            .post('/configstrategy/create')
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                description: 'Description of my new Config Strategy',
                strategy: StrategiesType.NETWORK,
                operation: OperationsType.EQUAL,
                values: ['192.168.0.1/16'],
                config: configId1,
                env: EnvType.DEFAULT
            }).expect(201)

        response = await request(app)
            .get('/configstrategy/' + response.body._id)
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send().expect(200)
    })

    test('STRATEGY_SUITE - Should not found Config Strategy information by Id', async () => {
        await request(app)
            .get('/configstrategy/INVALID_ID_VALUE')
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send().expect(500)

        await request(app)
            .get('/configstrategy/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send().expect(404)
    })

    test('STRATEGY_SUITE - Should delete Config Strategy', async () => {
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

        await request(app)
            .delete('/configstrategy/' + configStrategyId)
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send().expect(200)

        const admin = await Admin.findById(adminMasterAccountId)
        expect(admin).not.toBeNull()

        // DB validation After - Verify deleted dependencies
        domain = await Domain.findById(domainId)
        expect(domain).not.toBeNull()

        group = await GroupConfig.findById(groupConfigId)
        expect(group).not.toBeNull()

        config1 = await Config.findById(configId1)
        expect(config1).not.toBeNull()

        config2 = await Config.findById(configId2)
        expect(config2).not.toBeNull()

        configStrategy = await ConfigStrategy.findById(configStrategyId)
        expect(configStrategy).toBeNull()
    })

    test('STRATEGY_SUITE - Should NOT delete Config Strategy', async () => {
        await request(app)
            .delete('/configstrategy/INVALID_ID')
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send().expect(500)

        await request(app)
            .delete('/configstrategy/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send().expect(404)
    })
})

describe('Testing update strategies #1', () => {
    beforeAll(setupDatabase)

    test('STRATEGY_SUITE - Should update Config Strategy info', async () => {

        let configStrategy = await ConfigStrategy.findById(configStrategyId)
        expect(configStrategy).not.toBeNull()

        await request(app)
            .patch('/configstrategy/' + configStrategyId)
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                description: 'New description'
            }).expect(200)
        
        // DB validation - verify flag updated
        configStrategy = await ConfigStrategy.findById(configStrategyId)
        expect(configStrategy).not.toBeNull()
        expect(configStrategy.description).toEqual('New description')
    })

    test('STRATEGY_SUITE - Should NOT update Config Strategy info', async () => {
        await request(app)
            .patch('/configstrategy/' + configStrategyId)
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                activated: false,
                config: 'I_SHOULD_NOT_UPDATE_THIS'
            }).expect(400)
    })

    test('STRATEGY_SUITE - Should NOT update by invalid Config Strategy Id', async () => {
        await request(app)
            .patch('/configstrategy/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                description: 'New description',
            }).expect(404)

        await request(app)
            .patch('/configstrategy/INVALID_ID')
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                description: 'New description',
            }).expect(400)
    })

    test('STRATEGY_SUITE - Should record changes on history collection', async () => {
        let response = await request(app)
            .post('/configstrategy/create')
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                description: 'Description of my new Config Strategy',
                strategy: StrategiesType.DATE,
                operation: OperationsType.LOWER,
                values: ['2019-12-10'],
                config: configId2,
                env: EnvType.DEFAULT
            }).expect(201)
        
        const strategyId = response.body._id
        response = await request(app)
                .get('/configstrategy/history/' + strategyId)
                .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
                .send().expect(200)
        
        expect(response.body).toEqual([])

        await request(app)
            .patch('/configstrategy/' + strategyId)
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                description: 'New description'
            }).expect(200)

        response = await request(app)
            .get('/configstrategy/history/' + strategyId + '?sortBy=createdAt:desc')
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send().expect(200)

        expect(response.body).not.toEqual([])

        // DB validation
        let history = await History.find({ elementId: strategyId })
        expect(history[0].oldValue.get('description')).toEqual('Description of my new Config Strategy')
        expect(history[0].newValue.get('description')).toEqual('New description')

        await request(app)
            .patch('/configstrategy/updateStatus/' + strategyId)
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                default: false
            }).expect(200);
        
        // DB validation
        history = await History.find({ elementId: strategyId })
        expect(history.length).toEqual(2)
    })

    test('STRATEGY_SUITE - Should NOT list changes by invalid Strategy Id', async () => {
        await request(app)
            .get('/configstrategy/history/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send().expect(404)

        await request(app)
            .get('/configstrategy/history/INVALID_ID_VALUE')
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send().expect(500)
    })

    test('STRATEGY_SUITE - Should NOT return a specific strategy requirements', async () => {
        let response = await request(app)
            .get('/configstrategy/req/NON_EXISTENT_VALIDATION')
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send().expect(404)
        
        expect(response.body.error).toEqual('Strategy \'NON_EXISTENT_VALIDATION\' not found')
    })

    test('STRATEGY_SUITE - Should add new value to Strategy values', async () => {
        let response = await request(app)
            .patch('/configstrategy/addval/' + configStrategyId)
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                value: 'USER_4'
            }).expect(200)

        expect(response.body.values[response.body.values.length - 1]).toEqual('USER_4');

        // DB validation
        const configStrategy = await ConfigStrategy.findOne({ _id: configStrategyId })
        const foundExistingOne = configStrategy.values.find((element) => element === 'USER_4')
        expect('USER_4').toEqual(foundExistingOne)
    })

    test('STRATEGY_SUITE - Should NOT add new value to Strategy values', async () => {
        let response = await request(app)
            .patch('/configstrategy/addval/' + configStrategyId)
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                value: 'USER_3'
            }).expect(400)

        expect(response.body.error).toEqual('Value \'USER_3\' already exist');

        response = await request(app)
            .patch('/configstrategy/addval/' + configStrategyId)
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                not_valid_attribute: 'USER_3'
            }).expect(400);

        expect(response.body.error).toEqual('Invalid parameter');

        response = await request(app)
            .patch('/configstrategy/addval/' + configStrategyId)
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send().expect(400);

        expect(response.body.error).toEqual('The attribute \'value\' must be assigned');

        await request(app)
            .patch('/configstrategy/addval/INVALID_STRATEGY_ID')
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                value: 'USER_3'
            }).expect(400);

            await request(app)
                .patch('/configstrategy/addval/' + new mongoose.Types.ObjectId())
                .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
                .send({
                    value: 'USER_3'
                }).expect(404);
    })

    test('STRATEGY_SUITE - Should update a value inside Strategy values', async () => {
        let response = await request(app)
            .patch('/configstrategy/updateval/' + configStrategyId)
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                oldvalue: 'USER_3',
                newvalue: 'USER_THREE'
            }).expect(200)

        expect(response.body.values[response.body.values.length - 1]).toEqual('USER_THREE');

        // DB validation
        const configStrategy = await ConfigStrategy.findOne({ _id: configStrategyId })
        const foundExistingOne = configStrategy.values.find((element) => element === 'USER_THREE')
        expect('USER_THREE').toEqual(foundExistingOne)

        const notFoundOldOne = configStrategy.values.find((element) => element === 'USER_3')
        expect(notFoundOldOne).toEqual(undefined)
    })
})

describe('Testing update strategies #2', () => {
    beforeAll(setupDatabase)

    test('STRATEGY_SUITE - Should NOT update a value inside Strategy values', async () => {
        await request(app)
            .patch('/configstrategy/updateval/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                oldvalue: 'USER_3',
                newvalue: 'USER_2'
            }).expect(404)

        let response = await request(app)
            .patch('/configstrategy/updateval/' + configStrategyId)
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                oldvalue: 'USER_3',
                newvalue: 'USER_2'
            }).expect(400)

        expect(response.body.error).toEqual('Value \'USER_2\' already exist');

        response = await request(app)
            .patch('/configstrategy/updateval/' + configStrategyId)
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                old: 'USER_3',
                new: 'USER_2'
            }).expect(400)

        expect(response.body.error).toEqual('Invalid parameter');

        response = await request(app)
            .patch('/configstrategy/updateval/' + configStrategyId)
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                oldvalue: 'USER_3333333',
                newvalue: 'USER_5'
            }).expect(404)

        expect(response.body.error).toEqual('Old value \'USER_3333333\' not found');

        response = await request(app)
            .patch('/configstrategy/updateval/' + configStrategyId)
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send().expect(400)

        expect(response.body.error).toEqual('Attributes \'oldvalue\' and \'newvalue\' must be assigned');
    })

    test('STRATEGY_SUITE - Should remove a value from Strategy values', async () => {
        let configStrategy = await ConfigStrategy.findOne({ _id: configStrategyId })
        const numberOfValues = configStrategy.values.length

        let response = await request(app)
            .patch('/configstrategy/removeval/' + configStrategyId)
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                value: 'USER_3'
            }).expect(200)

        expect(response.body.values.length + 1).toEqual(numberOfValues);

        // DB validation
        configStrategy = await ConfigStrategy.findOne({ _id: configStrategyId })
        const notFoundOldOne = configStrategy.values.find((element) => element === 'USER_3')
        expect(notFoundOldOne).toEqual(undefined)
    })

    test('STRATEGY_SUITE - Should NOT remove a value from an invalid Strategy', async () => {
        await request(app)
            .patch('/configstrategy/removeval/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                value: 'USER_3'
            }).expect(404)

        await request(app)
            .patch('/configstrategy/removeval/INVALID_ID')
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                value: 'USER_3'
            }).expect(400)
    })

    test('STRATEGY_SUITE - Should NOT remove a value from Strategy values', async () => {
        let response = await request(app)
            .patch('/configstrategy/removeval/' + configStrategyId)
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                value: 'USER_44444'
            }).expect(404)

        expect(response.body.error).toEqual('Value \'USER_44444\' does not exist');

        response = await request(app)
            .patch('/configstrategy/removeval/' + configStrategyId)
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                val: 'USER_3'
            }).expect(400)

        expect(response.body.error).toEqual('Invalid parameter');

        response = await request(app)
            .patch('/configstrategy/removeval/' + configStrategyId)
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send().expect(400)

        expect(response.body.error).toEqual('The attribute \'value\' must be assigned');
    })
})

describe('Testing fetch strategies', () => {
    beforeAll(setupDatabase)

    test('STRATEGY_SUITE - Should fetch all values from a specific Strategy', async () => {
        let response = await request(app)
            .get('/configstrategy/values/' + configStrategyId)
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send().expect(200)

        expect(response.body).toEqual(configStrategyDocument.values);

        response = await request(app)
            .get('/configstrategy/values/' + configStrategyId + '?limit=2')
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send().expect(200)

        expect(response.body).toEqual(configStrategyDocument.values.slice(0,2));

        response = await request(app)
            .get('/configstrategy/values/' + configStrategyId + '?skip=1')
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send().expect(200)

        expect(response.body).toEqual(configStrategyDocument.values.slice(1,configStrategyDocument.values.length));
    })

    test('STRATEGY_SUITE - Should NOT fetch values from Strategy', async () => {
        await request(app)
            .get('/configstrategy/values/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send().expect(404)

        await request(app)
            .get('/configstrategy/values/INVALID_ID')
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send().expect(500)
    })

    test('STRATEGY_SUITE - Should update Strategy environment status - default', async () => {
        expect(configStrategyDocument.activated.get(EnvType.DEFAULT)).toEqual(true);

        const response = await request(app)
            .patch('/configstrategy/updateStatus/' + configStrategyId)
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                default: false
            }).expect(200);

        expect(response.body.activated[EnvType.DEFAULT]).toEqual(false);

        // DB validation - verify status updated
        const strategy = await ConfigStrategy.findById(configStrategyId)
        expect(strategy.activated.get(EnvType.DEFAULT)).toEqual(false);
    })

})

describe('Scenario: creating QA environment after innactivate PRD switch', () => {
    beforeAll(setupDatabase)

    test('STRATEGY_SUITE - Should update Strategy environment status - QA', async () => {
        // QA Environment still does not exist
        expect(configStrategyDocument.activated.get('QA')).toEqual(undefined);

        // Creating QA Environment...
        await request(app)
            .post('/environment/create')
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                name: 'QA',
                domain: domainId
            }).expect(201)

        const response = await request(app)
            .patch('/configstrategy/updateStatus/' + configStrategyId)
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                QA: true
            }).expect(200);

        expect(response.body.activated['QA']).toEqual(true);

        // DB validation - verify status updated
        let strategy = await ConfigStrategy.findById(configStrategyId)
        expect(strategy.activated.get(EnvType.DEFAULT)).toEqual(true);
        expect(strategy.activated.get('QA')).toEqual(true);

        // Inactivating QA. Default environment should stay activated
        await request(app)
            .patch('/configstrategy/updateStatus/' + configStrategyId)
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                QA: false
            }).expect(200);

        strategy = await ConfigStrategy.findById(configStrategyId)
        expect(strategy.activated.get(EnvType.DEFAULT)).toEqual(true);
        expect(strategy.activated.get('QA')).toEqual(false);
    })

    test('STRATEGY_SUITE - Should NOT update Strategy environment status - Permission denied', async () => {
        await request(app)
            .patch('/configstrategy/updateStatus/' + configStrategyId)
            .set('Authorization', `Bearer ${adminAccount.tokens[0].token}`)
            .send({
                default: false
            }).expect(400);
    })

    test('STRATEGY_SUITE - Should NOT update Strategy environment status - Strategy not fould', async () => {
        await request(app)
            .patch('/configstrategy/updateStatus/INVALID_ID')
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                default: false
            }).expect(400);

        await request(app)
            .patch('/configstrategy/updateStatus/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                default: false
            }).expect(404);
    })

    test('STRATEGY_SUITE - Should remove Strategy environment status', async () => {
        // Creating QA6 Environment...
        await request(app)
            .post('/environment/create')
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                name: 'QA6',
                domain: domainId
            }).expect(201)
        
        await request(app)
            .patch('/configstrategy/updateStatus/' + configStrategyId)
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                QA6: true
            }).expect(200);

        let strategy = await ConfigStrategy.findById(configStrategyId)
        expect(strategy.activated.get('QA6')).toEqual(true);

        await request(app)
            .patch('/configstrategy/removeStatus/' + configStrategyId)
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                env: 'QA6'
            }).expect(200);

        // DB validation - verify status updated
        strategy = await ConfigStrategy.findById(configStrategyId)
        expect(strategy.activated.get('QA6')).toEqual(undefined);
    })
})

describe('Scenario: default environment being deleted', () => {
    beforeAll(setupDatabase)

    test('STRATEGY_SUITE - Should NOT remove Strategy environment status', async () => {
        // Creating QA Environment...
        await request(app)
            .post('/environment/create')
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                name: 'QA',
                domain: domainId
            }).expect(201)

        await request(app)
            .patch('/configstrategy/updateStatus/' + configStrategyId)
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                QA: true
            }).expect(200);

        // default environment can be removed...
        await request(app)
            .patch('/configstrategy/removeStatus/' + configStrategyId)
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                env: EnvType.DEFAULT
            }).expect(200);

        // ... but at least one environment should be activate
        const response = await request(app)
            .patch('/configstrategy/removeStatus/' + configStrategyId)
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                env: 'QA'
            }).expect(400);

        expect(response.body.error).toEqual('Invalid operation. One environment status must be saved');
        
        // QA environment cannot be removed without permission
        await request(app)
            .patch('/configstrategy/removeStatus/' + configStrategyId)
            .set('Authorization', `Bearer ${adminAccount.tokens[0].token}`)
            .send({
                env: 'QA'
            }).expect(400);

        // Strategy does not exist
        await request(app)
            .patch('/configstrategy/removeStatus/FAKE_STRATEGY')
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send({
                env: 'QA'
            }).expect(400);

        const strategy = await ConfigStrategy.findById(configStrategyId)
        expect(strategy.activated.get(EnvType.DEFAULT)).toEqual(undefined);
        expect(strategy.activated.get('QA')).toEqual(true);
    })

    test('STRATEGY_SUITE - Should remove records from history after deleting element', async () => {
        let history = await History.find({ elementId: configStrategyId })
        expect(history.length > 0).toEqual(true)
        await request(app)
            .delete('/configstrategy/' + configStrategyId)
            .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
            .send().expect(200)

        history = await History.find({ elementId: configStrategyId })
        expect(history.length).toEqual(0)
    })

})