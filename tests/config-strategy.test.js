import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app';
import Admin from '../src/models/admin';
import Domain from '../src/models/domain';
import GroupConfig from '../src/models/group-config';
import { Config } from '../src/models/config';
import History from '../src/models/history';
import { EnvType } from '../src/models/environment';
import { ConfigStrategy, StrategiesType, OperationsType, strategyRequirements } from '../src/models/config-strategy';
import { 
    setupDatabase,
    adminMasterAccountId,
    adminMasterAccountToken,
    domainId,
    groupConfigId,
    configId1,
    configId2,
    configStrategyId,
    configStrategyDocument
 } from './fixtures/db_api';

afterAll(async () => { 
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mongoose.disconnect();
});

describe('Testing strategy creation #1', () => {
    beforeAll(setupDatabase);

    test('STRATEGY_SUITE - Should create a new Config Strategy', async () => {
        const response = await request(app)
            .post('/configstrategy/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                description: 'Description of my new Config Strategy',
                strategy: StrategiesType.NETWORK,
                operation: OperationsType.EXIST,
                values: ['192.168.0.1/16'],
                config: configId2,
                env: EnvType.DEFAULT
            }).expect(201);

        // DB validation - document created
        const configStrategy = await ConfigStrategy.findById(response.body._id).lean().exec();
        expect(configStrategy).not.toBeNull();

        // Response validation
        expect(response.body.description).toBe('Description of my new Config Strategy');
    });

    test('STRATEGY_SUITE - Should NOT create a new Config Strategy - Config not found', async () => {
        const response = await request(app)
            .post('/configstrategy/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                description: 'Description of my new Config Strategy',
                strategy: StrategiesType.NETWORK,
                operation: OperationsType.EQUAL,
                values: ['192.168.0.1/16'],
                config: new mongoose.Types.ObjectId(),
                env: EnvType.DEFAULT
            }).expect(404);

        expect(response.body.error).toBe('Config not found');
    });

    test('STRATEGY_SUITE - Should NOT create a new Config Strategy - Environment not found', async () => {
        const response = await request(app)
            .post('/configstrategy/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                description: 'Description of my new Config Strategy',
                strategy: StrategiesType.NETWORK,
                operation: OperationsType.EQUAL,
                values: ['192.168.0.1/16'],
                config: configId1,
                env: 'ENVIRONMENT_NOT_FOUND'
            }).expect(404);

        expect(response.body.error).toBe('Environment not found');
    });

    test('STRATEGY_SUITE - Should NOT create a new Config Strategy - Duplicated Strategy at the same configuration', async () => {
        const response = await request(app)
            .post('/configstrategy/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                description: 'Description of my new Config Strategy',
                strategy: StrategiesType.VALUE,
                operation: OperationsType.EQUAL,
                values: ['USER_1'],
                config: configId1,
                env: EnvType.DEFAULT
            }).expect(400);

        expect(response.body.error)
            .toBe(`Unable to complete the operation. Strategy '${StrategiesType.VALUE}' already exist for this configuration and environment`);
    });

    test('STRATEGY_SUITE - Should NOT create a new Config Strategy - Operation not available', async () => {
        const response = await request(app)
            .post('/configstrategy/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                description: 'Description of my new Config Strategy',
                strategy: StrategiesType.TIME,
                operation: OperationsType.EXIST,
                values: ['USER_1'],
                config: configId1,
                env: EnvType.DEFAULT
            }).expect(400);

        expect(response.body.error)
            .toBe(`Unable to complete the operation. The strategy '${StrategiesType.TIME}' needs BETWEEN,LOWER,GREATER as operation`);
    });

    test('STRATEGY_SUITE - Should NOT create a new Config Strategy - Wrong operation and strategies', async () => {
        await request(app)
            .post('/configstrategy/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                description: 'Description of my new Config Strategy',
                strategy: 'WRONG_STRATEGY',
                operation: OperationsType.EQUAL,
                values: ['192.168.0.1/16'],
                config: configId2
            }).expect(400);

        await request(app)
            .post('/configstrategy/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                description: 'Description of my new Config Strategy',
                strategy: StrategiesType.NETWORK,
                operation: 'WORNG_OPERATION',
                values: ['192.168.0.1/16'],
                config: configId2
            }).expect(400);
    });
});

describe('Testing strategy creation #2', () => {
    beforeAll(setupDatabase);

    test('STRATEGY_SUITE - Should NOT create a new Config Strategy - Number of values incorret', async () => {
        
        // VALUE
        let requirements = strategyRequirements(StrategiesType.VALUE);
        let { max, min } = requirements.operationRequirements.filter(element => element.operation === OperationsType.EQUAL)[0];

        let response = await request(app)
            .post('/configstrategy/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                description: 'Description of my new Config Strategy',
                strategy: StrategiesType.VALUE,
                operation: OperationsType.EQUAL,
                values: ['USER_1', 'USER_2'],
                config: configId2,
                env: EnvType.DEFAULT
            }).expect(400);

        expect(response.body.error)
            .toBe(`Unable to complete the operation. The number of values for the operation '${OperationsType.EQUAL}', are min: ${min} and max: ${max} values`);

        ({ max, min } = requirements.operationRequirements.filter(element => element.operation === OperationsType.EXIST)[0]);
        response = await request(app)
            .post('/configstrategy/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                description: 'Description of my new Config Strategy',
                strategy: StrategiesType.VALUE,
                operation: OperationsType.EXIST,
                values: [],
                config: configId2,
                env: EnvType.DEFAULT
            }).expect(400);

        expect(response.body.error)
            .toBe(`Unable to complete the operation. The number of values for the operation '${OperationsType.EXIST}', are min: ${min} and max: ${max} values`);
        
        // NETWORK
        requirements = strategyRequirements(StrategiesType.NETWORK);
        ({ max, min } = requirements.operationRequirements.filter(element => element.operation === OperationsType.EXIST)[0]);

        response = await request(app)
            .post('/configstrategy/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                description: 'Description of my new Config Strategy',
                strategy: StrategiesType.NETWORK,
                operation: OperationsType.EXIST,
                values: [],
                config: configId2,
                env: EnvType.DEFAULT
            }).expect(400);

        expect(response.body.error)
            .toBe(`Unable to complete the operation. The number of values for the operation '${OperationsType.EXIST}', are min: ${min} and max: ${max} values`);
        
        // TIME
        requirements = strategyRequirements(StrategiesType.TIME);
        ({ max, min } = requirements.operationRequirements.filter(element => element.operation === OperationsType.GREATER)[0]);

        response = await request(app)
            .post('/configstrategy/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                description: 'Description of my new Config Strategy',
                strategy: StrategiesType.TIME,
                operation: OperationsType.GREATER,
                values: ['2:00', '4:00'],
                config: configId2,
                env: EnvType.DEFAULT
            }).expect(400);

        expect(response.body.error)
            .toBe(`Unable to complete the operation. The number of values for the operation '${OperationsType.GREATER}', are min: ${min} and max: ${max} values`);
        
        ({ max, min } = requirements.operationRequirements.filter(element => element.operation === OperationsType.LOWER)[0]);

        response = await request(app)
            .post('/configstrategy/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                description: 'Description of my new Config Strategy',
                strategy: StrategiesType.TIME,
                operation: OperationsType.LOWER,
                values: ['2:00', '4:00'],
                config: configId2,
                env: EnvType.DEFAULT
            }).expect(400);

        expect(response.body.error)
            .toBe(`Unable to complete the operation. The number of values for the operation '${OperationsType.LOWER}', are min: ${min} and max: ${max} values`);
        
        ({ max, min } = requirements.operationRequirements.filter(element => element.operation === OperationsType.BETWEEN)[0]);

        response = await request(app)
            .post('/configstrategy/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                description: 'Description of my new Config Strategy',
                strategy: StrategiesType.TIME,
                operation: OperationsType.BETWEEN,
                values: ['2:00'],
                config: configId2,
                env: EnvType.DEFAULT
            }).expect(400);

        expect(response.body.error)
            .toBe(`Unable to complete the operation. The number of values for the operation '${OperationsType.BETWEEN}', are min: ${min} and max: ${max} values`);

        // DATE
        requirements = strategyRequirements(StrategiesType.DATE);
        ({ max, min } = requirements.operationRequirements.filter(element => element.operation === OperationsType.GREATER)[0]);

        response = await request(app)
            .post('/configstrategy/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                description: 'Description of my new Config Strategy',
                strategy: StrategiesType.DATE,
                operation: OperationsType.GREATER,
                values: ['2019-12-12', '2019-12-20'],
                config: configId2,
                env: EnvType.DEFAULT
            }).expect(400);

        expect(response.body.error)
            .toBe(`Unable to complete the operation. The number of values for the operation '${OperationsType.GREATER}', are min: ${min} and max: ${max} values`);
        
        ({ max, min } = requirements.operationRequirements.filter(element => element.operation === OperationsType.LOWER)[0]);

        response = await request(app)
            .post('/configstrategy/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                description: 'Description of my new Config Strategy',
                strategy: StrategiesType.DATE,
                operation: OperationsType.LOWER,
                values: ['2019-12-12', '2019-12-20'],
                config: configId2,
                env: EnvType.DEFAULT
            }).expect(400);

        expect(response.body.error)
            .toBe(`Unable to complete the operation. The number of values for the operation '${OperationsType.LOWER}', are min: ${min} and max: ${max} values`);
        
        ({ max, min } = requirements.operationRequirements.filter(element => element.operation === OperationsType.BETWEEN)[0]);

        response = await request(app)
            .post('/configstrategy/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                description: 'Description of my new Config Strategy',
                strategy: StrategiesType.DATE,
                operation: OperationsType.BETWEEN,
                values: ['2019-12-12'],
                config: configId2,
                env: EnvType.DEFAULT
            }).expect(400);

        expect(response.body.error)
            .toBe(`Unable to complete the operation. The number of values for the operation '${OperationsType.BETWEEN}', are min: ${min} and max: ${max} values`);

    });
});

describe('Testing reading strategies #1', () => {
    beforeAll(setupDatabase);

    test('STRATEGY_SUITE - Should get Config Strategy information', async () => {
        let response = await request(app)
            .get('/configstrategy?config=' + configId1)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        expect(response.body.length).toEqual(1);

        expect(String(response.body[0]._id)).toEqual(String(configStrategyDocument._id));
        expect(response.body[0].strategy).toEqual(configStrategyDocument.strategy);
        expect(response.body[0].operation).toEqual(configStrategyDocument.operation);
        expect(String(response.body[0].owner)).toEqual(String(configStrategyDocument.owner));
        expect(response.body[0].activated[EnvType.DEFAULT]).toEqual(configStrategyDocument.activated.get(EnvType.DEFAULT));

        // Adding new Config Strategy
        response = await request(app)
            .post('/configstrategy/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                description: 'Description of my new Config Strategy',
                strategy: StrategiesType.NETWORK,
                operation: OperationsType.EXIST,
                values: ['192.168.0.1/16'],
                config: configId1,
                env: EnvType.DEFAULT
            }).expect(201);

        // DB validation - document created
        const configStrategy = await ConfigStrategy.findById(response.body._id).lean().exec();
        expect(configStrategy).not.toBeNull();

        response = await request(app)
            .get('/configstrategy?config=' + configId1)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        expect(response.body.length).toEqual(2);
    });

    test('STRATEGY_SUITE - Should NOT get Config Strategy information - Invalid Config Id', async () => {
        await request(app)
            .get('/configstrategy?config=' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(404);

        await request(app)
            .get('/configstrategy?config=INVALID_ID_VALUE')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(422);
    });

    test('STRATEGY_SUITE - Should NOT get Config Strategy information - Invalid Environment query', async () => {
        await request(app)
            .get(`/configstrategy?config=${configId1}&env=${'a'.repeat(50)}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(422);
    });
});

describe('Testing reading strategies #2', () => {
    beforeAll(setupDatabase);

    test('STRATEGY_SUITE - Should get Config Strategy information by Id', async () => {
        let response = await request(app)
            .get('/configstrategy/' + configStrategyId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        expect(String(response.body._id)).toEqual(String(configStrategyDocument._id));
        expect(response.body.strategy).toEqual(configStrategyDocument.strategy);
        expect(response.body.operation).toEqual(configStrategyDocument.operation);
        expect(String(response.body.owner)).toEqual(String(configStrategyDocument.owner));
        expect(response.body.activated[EnvType.DEFAULT]).toEqual(configStrategyDocument.activated.get(EnvType.DEFAULT));

        // Adding new Config Strategy
        response = await request(app)
            .post('/configstrategy/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                description: 'Description of my new Config Strategy',
                strategy: StrategiesType.NETWORK,
                operation: OperationsType.EXIST,
                values: ['192.168.0.1/16'],
                config: configId1,
                env: EnvType.DEFAULT
            }).expect(201);

        await request(app)
            .get('/configstrategy/' + response.body._id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);
    });

    test('STRATEGY_SUITE - Should not found Config Strategy information by Id', async () => {
        await request(app)
            .get('/configstrategy/INVALID_ID_VALUE')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(422);

        await request(app)
            .get('/configstrategy/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(404);
    });

    test('STRATEGY_SUITE - Should delete Config Strategy', async () => {
        // DB validation Before deleting
        let domain = await Domain.findById(domainId).lean().exec();
        expect(domain).not.toBeNull();

        let group = await GroupConfig.findById(groupConfigId).lean().exec();
        expect(group).not.toBeNull();

        let config1 = await Config.findById(configId1).lean().exec();
        expect(config1).not.toBeNull();

        let config2 = await Config.findById(configId2).lean().exec();
        expect(config2).not.toBeNull();

        let configStrategy = await ConfigStrategy.findById(configStrategyId).lean().exec();
        expect(configStrategy).not.toBeNull();

        await request(app)
            .delete('/configstrategy/' + configStrategyId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        const admin = await Admin.findById(adminMasterAccountId).lean().exec();
        expect(admin).not.toBeNull();

        // DB validation After - Verify deleted dependencies
        domain = await Domain.findById(domainId).lean().exec();
        expect(domain).not.toBeNull();

        group = await GroupConfig.findById(groupConfigId).lean().exec();
        expect(group).not.toBeNull();

        config1 = await Config.findById(configId1).lean().exec();
        expect(config1).not.toBeNull();

        config2 = await Config.findById(configId2).lean().exec();
        expect(config2).not.toBeNull();

        configStrategy = await ConfigStrategy.findById(configStrategyId).lean().exec();
        expect(configStrategy).toBeNull();
    });

    test('STRATEGY_SUITE - Should NOT delete Config Strategy', async () => {
        await request(app)
            .delete('/configstrategy/INVALID_ID')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(422);

        await request(app)
            .delete('/configstrategy/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(404);
    });
});

describe('Testing update strategies #1', () => {
    beforeAll(setupDatabase);

    test('STRATEGY_SUITE - Should update Config Strategy info', async () => {

        let configStrategy = await ConfigStrategy.findById(configStrategyId).lean().exec();
        expect(configStrategy).not.toBeNull();

        await request(app)
            .patch('/configstrategy/' + configStrategyId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                description: 'New description'
            }).expect(200);
        
        // DB validation - verify flag updated
        configStrategy = await ConfigStrategy.findById(configStrategyId).lean().exec();
        expect(configStrategy).not.toBeNull();
        expect(configStrategy.description).toEqual('New description');
    });

    test('STRATEGY_SUITE - Should NOT update Config Strategy - Invalid Config Id', async () => {
        await request(app)
            .patch('/configstrategy/' + configStrategyId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                activated: false,
                config: 'I_SHOULD_NOT_UPDATE_THIS'
            }).expect(400);
    });

    test('STRATEGY_SUITE - Should NOT update Config Strategy - Invalid Strategy Id', async () => {
        await request(app)
            .patch('/configstrategy/INVALID_ID')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                description: 'New description',
            }).expect(422);
    });

    test('STRATEGY_SUITE - Should NOT update Config Strategy - Config Strategy Id not found', async () => {
        await request(app)
            .patch('/configstrategy/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                description: 'New description',
            }).expect(404);
    });

    test('STRATEGY_SUITE - Should record changes on history collection', async () => {
        let response = await request(app)
            .post('/configstrategy/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                description: 'Description of my new Config Strategy',
                strategy: StrategiesType.DATE,
                operation: OperationsType.LOWER,
                values: ['2019-12-10'],
                config: configId2,
                env: EnvType.DEFAULT
            }).expect(201);
        
        const strategyId = response.body._id;
        response = await request(app)
                .get('/configstrategy/history/' + strategyId)
                .set('Authorization', `Bearer ${adminMasterAccountToken}`)
                .send().expect(200);
        
        expect(response.body).toEqual([]);

        await request(app)
            .patch('/configstrategy/' + strategyId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                description: 'New description'
            }).expect(200);

        response = await request(app)
            .get(`/configstrategy/history/${strategyId}?sortBy=createdAt:desc`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        expect(response.body).not.toEqual([]);

        // DB validation
        let history = await History.find({ elementId: strategyId }).lean().exec();
        expect(history[0].oldValue['description']).toEqual('Description of my new Config Strategy');
        expect(history[0].newValue['description']).toEqual('New description');

        await request(app)
            .patch('/configstrategy/updateStatus/' + strategyId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                default: false
            }).expect(200);
        
        // DB validation
        history = await History.find({ elementId: strategyId }).lean().exec();
        expect(history.length).toEqual(2);
    });

    test('STRATEGY_SUITE - Should NOT list changes by invalid Strategy Id', async () => {
        await request(app)
            .get('/configstrategy/history/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(404);

        await request(app)
            .get('/configstrategy/history/INVALID_ID_VALUE')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(422);
    });

    test('STRATEGY_SUITE - Should NOT delete history by invalid Strategy Id', async () => {
        await request(app)
            .delete('/configstrategy/history/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(404);

        await request(app)
            .delete('/configstrategy/history/INVALID_ID_VALUE')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(422);
    });

    test('STRATEGY_SUITE - Should delete history from a Strategy element', async () => {
        let response = await request(app)
            .post('/configstrategy/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                description: 'Description of my new Config Strategy',
                strategy: StrategiesType.TIME,
                operation: OperationsType.LOWER,
                values: ['10:00'],
                config: configId2,
                env: EnvType.DEFAULT
            }).expect(201);
        
        const strategyId = response.body._id;
        response = await request(app)
                .get('/configstrategy/history/' + strategyId)
                .set('Authorization', `Bearer ${adminMasterAccountToken}`)
                .send().expect(200);
        
        expect(response.body).toEqual([]);

        await request(app)
            .patch('/configstrategy/' + strategyId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                description: 'New description'
            }).expect(200);

        let history = await History.find({ elementId: strategyId }).lean().exec();
        expect(history.length > 0).toEqual(true);

        await request(app)
            .delete('/configstrategy/history/' + strategyId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        history = await History.find({ elementId: strategyId }).lean().exec();
        expect(history.length > 0).toEqual(false);
    });

    test('STRATEGY_SUITE - Should return a specific strategy requirements', async () => {
        let response = await request(app)
            .get('/configstrategy/req/' + StrategiesType.NETWORK)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        expect(response.body.strategy).toEqual(StrategiesType.NETWORK);
    });

    test('STRATEGY_SUITE - Should NOT return a specific strategy requirements', async () => {
        let response = await request(app)
            .get('/configstrategy/req/WHO_AM_I_VALIDATION')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(404);
        
        expect(response.body.error)
            .toEqual(`Strategy 'WHO_AM_I_VALIDATION' not found. Please, try using: ${Object.values(StrategiesType)}`);
    });

    test('STRATEGY_SUITE - Should return a list of strategies available', async () => {
        let response = await request(app)
            .get('/configstrategy/spec/strategies')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);
        
        expect(response.body.strategiesAvailable.length).not.toEqual(0);
    });

    test('STRATEGY_SUITE - Should add new value to Strategy values', async () => {
        let response = await request(app)
            .patch('/configstrategy/addval/' + configStrategyId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                value: 'USER_4'
            }).expect(200);

        expect(response.body.values[response.body.values.length - 1]).toEqual('USER_4');

        // DB validation
        const configStrategy = await ConfigStrategy.findOne({ _id: configStrategyId }).lean().exec();
        const foundExistingOne = configStrategy.values.find((element) => element === 'USER_4');
        expect('USER_4').toEqual(foundExistingOne);
    });

    test('STRATEGY_SUITE - Should NOT add new value to Strategy values - Value already exist', async () => {
        const response = await request(app)
            .patch('/configstrategy/addval/' + configStrategyId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                value: 'USER_3'
            }).expect(400);

        expect(response.body.error).toEqual('Value \'USER_3\' already exist');
    });

    test('STRATEGY_SUITE - Should NOT add new value to Strategy values - Invalid parameter', async () => {
        const response = await request(app)
            .patch('/configstrategy/addval/' + configStrategyId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                not_valid_attribute: 'USER_3'
            }).expect(400);

        expect(response.body.error).toEqual('Invalid update parameters');
    });

    test('STRATEGY_SUITE - Should NOT add new value to Strategy values - Unassigned attribute', async () => {
        const response = await request(app)
            .patch('/configstrategy/addval/' + configStrategyId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(400);

        expect(response.body.error).toEqual('The attribute \'value\' must be assigned');
    });

    test('STRATEGY_SUITE - Should NOT add new value to Strategy values - Value too big', async () => {
        const response = await request(app)
            .patch('/configstrategy/addval/' + configStrategyId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                value: 'A'.repeat(129)
            }).expect(400);

        expect(response.body.error).toEqual('Value cannot be longer than 128 characters');
    });

    test('STRATEGY_SUITE - Should NOT add new value to Strategy values - Invalid Strategy Id', async () => {
        await request(app)
            .patch('/configstrategy/addval/INVALID_STRATEGY_ID')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                value: 'USER_3'
            }).expect(422);
    });

    test('STRATEGY_SUITE - Should NOT add new value to Strategy values - Strategy Id Not Found', async () => {
        await request(app)
            .patch('/configstrategy/addval/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                value: 'USER_3'
            }).expect(404);
    });

    test('STRATEGY_SUITE - Should NOT update a values - Invalid Strategy Id', async () => {
        await request(app)
            .patch('/configstrategy/updateval/INVALID_ID')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                oldvalue: 'USER_3',
                newvalue: 'USER_THREE'
            }).expect(422);
    });

    test('STRATEGY_SUITE - Should update a value inside Strategy values', async () => {
        let response = await request(app)
            .patch('/configstrategy/updateval/' + configStrategyId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                oldvalue: 'USER_3',
                newvalue: 'USER_THREE'
            }).expect(200);

        expect(response.body.values[response.body.values.length - 1]).toEqual('USER_THREE');

        // DB validation
        const configStrategy = await ConfigStrategy.findOne({ _id: configStrategyId }).lean().exec();
        const foundExistingOne = configStrategy.values.find((element) => element === 'USER_THREE');
        expect('USER_THREE').toEqual(foundExistingOne);

        const notFoundOldOne = configStrategy.values.find((element) => element === 'USER_3');
        expect(notFoundOldOne).toEqual(undefined);
    });
});

describe('Testing update strategies #2', () => {
    beforeAll(setupDatabase);

    test('STRATEGY_SUITE - Should NOT update a value inside Strategy values', async () => {
        await request(app)
            .patch('/configstrategy/updateval/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                oldvalue: 'USER_3',
                newvalue: 'USER_2'
            }).expect(404);

        let response = await request(app)
            .patch('/configstrategy/updateval/' + configStrategyId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                oldvalue: 'USER_3',
                newvalue: 'USER_2'
            }).expect(400);

        expect(response.body.error).toEqual('Value \'USER_2\' already exist');

        response = await request(app)
            .patch('/configstrategy/updateval/' + configStrategyId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                old: 'USER_3',
                new: 'USER_2'
            }).expect(400);

        expect(response.body.error).toEqual('Invalid update parameters');

        response = await request(app)
            .patch('/configstrategy/updateval/' + configStrategyId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                oldvalue: 'USER_3333333',
                newvalue: 'USER_5'
            }).expect(400);

        expect(response.body.error).toEqual('Old value \'USER_3333333\' not found');

        response = await request(app)
            .patch('/configstrategy/updateval/' + configStrategyId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(400);

        expect(response.body.error).toEqual('Attributes \'oldvalue\' and \'newvalue\' must be assigned');
    });

    test('STRATEGY_SUITE - Should remove a value from Strategy values', async () => {
        let configStrategy = await ConfigStrategy.findOne({ _id: configStrategyId }).lean().exec();
        const numberOfValues = configStrategy.values.length;

        let response = await request(app)
            .patch('/configstrategy/removeval/' + configStrategyId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                value: 'USER_3'
            }).expect(200);

        expect(response.body.values.length + 1).toEqual(numberOfValues);

        // DB validation
        configStrategy = await ConfigStrategy.findOne({ _id: configStrategyId }).lean().exec();
        const notFoundOldOne = configStrategy.values.find((element) => element === 'USER_3');
        expect(notFoundOldOne).toEqual(undefined);
    });

    test('STRATEGY_SUITE - Should NOT remove a value from an invalid Strategy', async () => {
        await request(app)
            .patch('/configstrategy/removeval/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                value: 'USER_3'
            }).expect(404);

        await request(app)
            .patch('/configstrategy/removeval/INVALID_ID')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                value: 'USER_3'
            }).expect(422);
    });

    test('STRATEGY_SUITE - Should NOT remove a value from Strategy values', async () => {
        let response = await request(app)
            .patch('/configstrategy/removeval/' + configStrategyId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                value: 'USER_44444'
            }).expect(400);

        expect(response.body.error).toEqual('Value \'USER_44444\' does not exist');

        response = await request(app)
            .patch('/configstrategy/removeval/' + configStrategyId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                val: 'USER_3'
            }).expect(400);

        expect(response.body.error).toEqual('Invalid update parameters');

        response = await request(app)
            .patch('/configstrategy/removeval/' + configStrategyId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(400);

        expect(response.body.error).toEqual('The attribute \'value\' must be assigned');
    });
});

describe('Testing fetch strategies', () => {
    beforeAll(setupDatabase);

    test('STRATEGY_SUITE - Should fetch all values from a specific Strategy', async () => {
        let response = await request(app)
            .get('/configstrategy/values/' + configStrategyId + '?sortBy=createdAt:desc')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        expect(response.body).toEqual(configStrategyDocument.values);

        response = await request(app)
            .get('/configstrategy/values/' + configStrategyId + '?limit=2&sort=true')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        expect(response.body).toEqual(configStrategyDocument.values.slice(0,2));

        response = await request(app)
            .get('/configstrategy/values/' + configStrategyId + '?skip=1')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        expect(response.body).toEqual(configStrategyDocument.values.slice(1,configStrategyDocument.values.length));
    });

    test('STRATEGY_SUITE - Should NOT fetch values from Strategy', async () => {
        await request(app)
            .get('/configstrategy/values/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(404);

        await request(app)
            .get('/configstrategy/values/INVALID_ID')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(422);
    });

    test('STRATEGY_SUITE - Should update Strategy environment status - default', async () => {
        expect(configStrategyDocument.activated.get(EnvType.DEFAULT)).toEqual(true);

        const response = await request(app)
            .patch('/configstrategy/updateStatus/' + configStrategyId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                default: false
            }).expect(200);

        expect(response.body.activated[EnvType.DEFAULT]).toEqual(false);

        // DB validation - verify status updated
        const strategy = await ConfigStrategy.findById(configStrategyId).lean().exec();
        expect(strategy.activated[EnvType.DEFAULT]).toEqual(false);
    });

});

describe('Scenario: creating QA environment and modifying its status', () => {
    beforeAll(setupDatabase);

    test('STRATEGY_SUITE - Should update Strategy environment status - QA', async () => {
        // Creating QA Environment...
        await request(app)
            .post('/environment/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'QA',
                domain: domainId
            }).expect(201);

        const newStrategy = await request(app)
            .post('/configstrategy/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                description: 'Description of my new Config Strategy',
                strategy: StrategiesType.NETWORK,
                operation: OperationsType.EXIST,
                values: ['192.168.0.1/16'],
                config: configId2,
                env: 'QA'
            }).expect(201);

        const response = await request(app)
            .patch('/configstrategy/updateStatus/' + newStrategy.body._id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                QA: true
            }).expect(200);

        expect(response.body.activated['QA']).toEqual(true);

        // DB validation - verify status updated
        let strategy = await ConfigStrategy.findById(newStrategy.body._id).lean().exec();
        expect(strategy.activated['QA']).toEqual(true);

        // Inactivating QA. Default environment should stay activated
        await request(app)
            .patch('/configstrategy/updateStatus/' + newStrategy.body._id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                QA: false
            }).expect(200);

        strategy = await ConfigStrategy.findById(newStrategy.body._id).lean().exec();
        expect(strategy.activated['QA']).toEqual(false);
    });

    test('STRATEGY_SUITE - Should NOT update Strategy environment status - Strategy not fould', async () => {
        await request(app)
            .patch('/configstrategy/updateStatus/INVALID_ID')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                default: false
            }).expect(422);

        await request(app)
            .patch('/configstrategy/updateStatus/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                default: false
            }).expect(404);
    });

    test('STRATEGY_SUITE - Should NOT update Strategy environment status - More than one environemnt', async () => {
        const response = await request(app)
            .patch('/configstrategy/updateStatus/' + configStrategyId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                default: false,
                QA: true
            }).expect(400);

        expect(response.body.error).toEqual('You can only update one environment at time');
    });

    test('STRATEGY_SUITE - Should NOT update Strategy environment status - Stragey does not exist on a specific environment', async () => {
        const response = await request(app)
            .patch('/configstrategy/updateStatus/' + configStrategyId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                QA: true
            }).expect(400);

        expect(response.body.error).toEqual('Strategy does not exist on this environment');
    });
});