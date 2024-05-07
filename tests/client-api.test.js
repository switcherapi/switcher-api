import mongoose from 'mongoose';
import request from 'supertest';
import sinon from 'sinon';
import app from '../src/app';
import { ActionTypes, RouterTypes } from '../src/models/permission';
import { permissionCache } from '../src/helpers/cache';
import Domain from '../src/models/domain';
import GroupConfig from '../src/models/group-config';
import { Config } from '../src/models/config';
import Component from '../src/models/component';
import { ConfigStrategy, StrategiesType, OperationsType } from '../src/models/config-strategy';
import { EnvType } from '../src/models/environment';
import { adminMasterAccountId } from './fixtures/db_api';
import Admin from '../src/models/admin';
import { Metric } from '../src/models/metric';
import * as graphqlUtils from './graphql-utils';
import { 
    setupDatabase,
    adminMasterAccountToken,
    adminAccountToken,
    apiKey,
    keyConfig,
    keyConfigPrdQA,
    configId,
    groupConfigId,
    domainId,
    domainDocument,
    configStrategyUSERId,
    component1,
    adminAccountId,
    slack
} from './fixtures/db_client';

const changeStrategy = async (strategyId, newOperation, status, environment) => {
    const strategy = await ConfigStrategy.findById(strategyId).exec();
    strategy.operation = newOperation || strategy.operation;
    strategy.activated.set(environment, status !== undefined ? status : strategy.activated.get(environment));
    strategy.updatedBy = adminMasterAccountId;
    await strategy.save();
};

const changeConfigStatus = async (configid, status, environment) => {
    const config = await Config.findById(configid).exec();
    config.activated.set(environment, status !== undefined ? status : config.activated.get(environment));
    config.updatedBy = adminMasterAccountId;
    await config.save();
};

const changeConfigDisableMetricFlag = async (configid, status, environment) => {
    const config = await Config.findById(configid).exec();
    if (!config.disable_metrics)
        config.disable_metrics = new Map;

    config.disable_metrics.set(environment, status);
    config.updatedBy = adminMasterAccountId;
    await config.save();
};

const changeGroupConfigStatus = async (groupconfigid, status, environment) => {
    const groupConfig = await GroupConfig.findById(groupconfigid).exec();
    groupConfig.activated.set(environment, status !== undefined ? status : groupConfig.activated.get(environment));
    groupConfig.updatedBy = adminMasterAccountId;
    await groupConfig.save();
};

const changeDomainStatus = async (domainid, status, environment) => {
    const domain = await Domain.findById(domainid).exec();
    domain.activated.set(environment, status !== undefined ? status : domain.activated.get(environment));
    domain.updatedBy = adminMasterAccountId;
    await domain.save();
};

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

describe('Testing criteria [GraphQL] ', () => {
    let token;

    beforeAll(async () => {
        const response = await createRequestAuth();
        token = response.body.token;
    });

    afterAll(setupDatabase);

    test('CLIENT_SUITE - Should return success on a simple CRITERIA response', async () => {
        const req = await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.criteriaQuery(keyConfig, graphqlUtils.buildEntries([
                [StrategiesType.VALUE, 'USER_1'], 
                [StrategiesType.NETWORK, '10.0.0.3']]))
            );

        const expected = graphqlUtils.criteriaResult('true', 'Success');
        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).toMatchObject(JSON.parse(expected));
    });

    test('CLIENT_SUITE - Should return success on Flat view resolved by Group name', async () => {
        const req = await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.configurationQuery([['group', 'Group Test']]));

        expect(req.statusCode).toBe(200);
        expect(req.body).toMatchObject(JSON.parse(graphqlUtils.expected100));
    });

    test('CLIENT_SUITE - Should return on Flat view resolved without an unknown Group name', async () => {
        const req = await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.configurationQuery([['group', 'UNKNOWN GROUP NAME']]));

        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).toMatchObject(JSON.parse(graphqlUtils.expected112));
    });

    test('CLIENT_SUITE - Should return success on Flat view resolved by Config Key', async () => {
        const req = await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.configurationQuery([['key', keyConfig]]));

        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).toMatchObject(JSON.parse(graphqlUtils.expected101));
    });

    test('CLIENT_SUITE - Should NOT authenticate invalid component', async () => {
        await request(app)
            .post('/criteria/auth')
            .set('switcher-api-key', `${apiKey}`)
            .send({
                domain: domainDocument.name,
                component: 'UNKNOWN COMPONENT',
                environment: EnvType.DEFAULT
            }).expect(401);
    });

    test('CLIENT_SUITE - Should NOT authenticate invalid environment', async () => {
        await request(app)
            .post('/criteria/auth')
            .set('switcher-api-key', `${apiKey}`)
            .send({
                domain: domainDocument.name,
                component: component1.name,
                environment: 'UNKNOWN ENVIRONMENT'
            }).expect(401);
    });

    test('CLIENT_SUITE - Should return on Flat view without unknown Config Key', async () => {
        const req = await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.configurationQuery([['key', 'UNKNOWN_CONFIG_KEY']]));

        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).toMatchObject(JSON.parse(graphqlUtils.expected112));
    });

    test('CLIENT_SUITE - Should NOT return success on a simple CRITERIA response - Bad login input', async () => {
        const req = await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.criteriaQuery(keyConfig, graphqlUtils.buildEntries([
                [StrategiesType.VALUE, 'USER_4'], 
                [StrategiesType.NETWORK, '10.0.0.3']]))
            );

        const expected = graphqlUtils.criteriaResult('false', `Strategy '${StrategiesType.VALUE}' does not agree`);
        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).toMatchObject(JSON.parse(expected));
    });

    test('CLIENT_SUITE - Should NOT return success on a simple CRITERIA response - Missing input', async () => {
        const req = await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.criteriaQuery(keyConfig, graphqlUtils.buildEntries([
                [StrategiesType.VALUE, 'USER_2']]))
            );

        const expected = graphqlUtils.criteriaResult('false', `Strategy '${StrategiesType.NETWORK}' does not agree`);
        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).toMatchObject(JSON.parse(expected));
    });

    test('CLIENT_SUITE - Should NOT return success on a simple CRITERIA response - Invalid KEY', async () => {
        const req = await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.criteriaQuery('INVALID_KEY', graphqlUtils.buildEntries([
                [StrategiesType.VALUE, 'USER_1'],
                [StrategiesType.NETWORK, '10.0.0.3']]))
            );

        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text).data.criteria).toEqual(null);
    });

    test('CLIENT_SUITE - Should return config disabled for PRD environment while activated in QA', async () => {
        // Config enabled
        const response = await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.criteriaQuery(keyConfig, graphqlUtils.buildEntries([
                [StrategiesType.VALUE, 'USER_1'],
                [StrategiesType.NETWORK, '10.0.0.3']]))
            )
            .expect(200);

        const expected = graphqlUtils.criteriaResult('true', 'Success');
        expect(JSON.parse(response.text)).toMatchObject(JSON.parse(expected));
    });

    test('CLIENT_SUITE - It will be deactivated on default environment', async () => {
        await changeConfigStatus(configId, false, EnvType.DEFAULT);
        const response = await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.criteriaQuery(keyConfig, graphqlUtils.buildEntries([
                [StrategiesType.VALUE, 'USER_1'],
                [StrategiesType.NETWORK, '10.0.0.3']]))
            )
            .expect(200);

        const expected = graphqlUtils.criteriaResult('false', 'Config disabled');
        expect(JSON.parse(response.text)).toMatchObject(JSON.parse(expected));
    });

    test('CLIENT_SUITE - It will be activated on QA environment', async () => {
        let qaToken;
        const responseToken = await request(app)
            .post('/criteria/auth')
            .set('switcher-api-key', `${apiKey}`)
            .send({
                domain: domainDocument.name,
                component: component1.name,
                environment: 'QA'
            }).expect(200);
        qaToken = responseToken.body.token;

        await changeConfigStatus(configId, true, 'QA');
        const response = await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${qaToken}`)
            .send(graphqlUtils.criteriaQuery(keyConfig, graphqlUtils.buildEntries([
                [StrategiesType.VALUE, 'USER_1'],
                [StrategiesType.NETWORK, '10.0.0.3']]))
            )
            .expect(200);

        const expected = graphqlUtils.criteriaResult('true', 'Success');
        expect(JSON.parse(response.text)).toMatchObject(JSON.parse(expected));
    });

    test('CLIENT_SUITE - Should return false after changing strategy operation', async () => {
        let qaToken;
        const responseToken = await request(app)
            .post('/criteria/auth')
            .set('switcher-api-key', `${apiKey}`)
            .send({
                domain: domainDocument.name,
                component: component1.name,
                environment: 'QA'
            }).expect(200);
        qaToken = responseToken.body.token;

        await changeStrategy(configStrategyUSERId, OperationsType.NOT_EXIST, true, 'QA');
        await changeStrategy(configStrategyUSERId, undefined, false, EnvType.DEFAULT);
        const response = await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${qaToken}`)
            .send(graphqlUtils.criteriaQuery(keyConfig, graphqlUtils.buildEntries([
                [StrategiesType.VALUE, 'USER_1'],
                [StrategiesType.NETWORK, '10.0.0.3']]))
            )
            .expect(200);

        const expected = graphqlUtils.criteriaResult('false', `Strategy '${StrategiesType.VALUE}' does not agree`);
        expect(JSON.parse(response.text)).toMatchObject(JSON.parse(expected));
    });

    test('CLIENT_SUITE - Should return success for default environment now, since the strategy has started being specific for QA environment', async () => {
        await changeConfigStatus(configId, true, EnvType.DEFAULT);
        const response = await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.criteriaQuery(keyConfig, graphqlUtils.buildEntries([
                [StrategiesType.VALUE, 'USER_1'],
                [StrategiesType.NETWORK, '10.0.0.3']]))
            )
            .expect(200);

        const expected = graphqlUtils.criteriaResult('true', 'Success');
        expect(JSON.parse(response.text)).toMatchObject(JSON.parse(expected));
    });

    test('CLIENT_SUITE - Should return false due to Group deactivation', async () => {
        await changeGroupConfigStatus(groupConfigId, false, EnvType.DEFAULT);
        const response = await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.criteriaQuery(keyConfig, graphqlUtils.buildEntries([
                [StrategiesType.VALUE, 'USER_1'],
                [StrategiesType.NETWORK, '10.0.0.3']]))
            )
            .expect(200);

        const expected = graphqlUtils.criteriaResult('false', 'Group disabled');
        expect(JSON.parse(response.text)).toMatchObject(JSON.parse(expected));
    });

    test('CLIENT_SUITE - Should return false due to Domain deactivation', async () => {
        await changeGroupConfigStatus(groupConfigId, true, EnvType.DEFAULT);
        await changeDomainStatus(domainId, false, EnvType.DEFAULT);
        const response = await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.criteriaQuery(keyConfig, graphqlUtils.buildEntries([
                [StrategiesType.VALUE, 'USER_1'],
                [StrategiesType.NETWORK, '10.0.0.3']]))
            )
            .expect(200);

        const expected = graphqlUtils.criteriaResult('false', 'Domain disabled');
        expect(JSON.parse(response.text)).toMatchObject(JSON.parse(expected));
    });

    test('CLIENT_SUITE - Should not add to metrics when Config has disabled metric flag = true', async () => {
        //given
        await changeConfigStatus(configId, true, EnvType.DEFAULT);

        //add one metric data
        await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.criteriaQuery(keyConfig, graphqlUtils.buildEntries([
                [StrategiesType.VALUE, 'USER_1'],
                [StrategiesType.NETWORK, '10.0.0.3']]))
            )
            .expect(200);

        //get total of metric data
        const numMetricData = await Metric.find({ config: configId }).countDocuments().exec();

        //disable metrics
        await changeConfigDisableMetricFlag(configId, true, EnvType.DEFAULT);

        //call again
        await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.criteriaQuery(keyConfig, graphqlUtils.buildEntries([
                [StrategiesType.VALUE, 'USER_1'],
                [StrategiesType.NETWORK, '10.0.0.3']]))
            )
            .expect(200);

        //test
        const afterNumMetricData = await Metric.find({ config: configId }).countDocuments().exec();
        expect(numMetricData === afterNumMetricData).toBe(true);
    });
});

describe('Testing domain', () => {
    let token;

    beforeAll(async () => {
        const response = await request(app)
            .post('/criteria/auth')
            .set('switcher-api-key', `${apiKey}`)
            .send({
                domain: domainDocument.name,
                component: component1.name,
                environment: EnvType.DEFAULT
            }).expect(200);

        token = response.body.token;
    });

    afterAll(setupDatabase);

    test('CLIENT_SUITE - Should return the Domain structure', async () => {
        const req = await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.domainQuery([['_id', domainId]], true, true, true));

        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).toMatchObject(JSON.parse(graphqlUtils.expected102));
    });

    test('CLIENT_SUITE - Should return 2 switchers when NOT filtered by Component', async () => {
        const req = await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.domainQuery([
                ['environment', EnvType.DEFAULT]])
            );
        
        const result = JSON.parse(req.text);
        expect(req.statusCode).toBe(200);
        expect(result.data.domain.group[0].config.length).toBe(2);
    });

    test('CLIENT_SUITE - Should return 1 switcher when filtered by Component', async () => {
        const req = await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.domainQuery([
                ['environment', EnvType.DEFAULT],
                ['_component', 'TestApp']])
            );

        const result = JSON.parse(req.text);
        expect(req.statusCode).toBe(200);
        expect(result.data.domain.group[0].config.length).toBe(1);
    });

    test('CLIENT_SUITE - Should return the Domain structure - Just using environment', async () => {
        // Domain will be resolved while identifying the component
        const req = await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.domainQuery([
                ['environment', EnvType.DEFAULT]], true, true, true)
            );

        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).toMatchObject(JSON.parse(graphqlUtils.expected102));
    });

    test('CLIENT_SUITE - Should return the Domain structure - Disabling strategies (resolver test)', async () => {
        const req = await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.domainQuery([['_id', domainId]], true, true, false));
    
        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).toMatchObject(JSON.parse(graphqlUtils.expected103));
    });

    test('CLIENT_SUITE - Should return the Domain structure - Disabling group config (resolver test)', async () => {
        const req = await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.domainQuery([['_id', domainId]], false, false, false));
         
        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).toMatchObject(JSON.parse(graphqlUtils.expected104));
    });

    test('CLIENT_SUITE - Should return the Domain structure - Disabling config (resolver test)', async () => {
        const req = await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.domainQuery([['_id', domainId]], true, false, false));

        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).toMatchObject(JSON.parse(graphqlUtils.expected105(keyConfigPrdQA)));
    });
});

describe('Testing criteria [REST] ', () => {
    let token;

    beforeAll(async () => {
        const response = await createRequestAuth();
        token = response.body.token;
    });

    test('CLIENT_SUITE - Should return success on a entry-based CRITERIA response', async () => {
        const req = await request(app)
            .post(`/criteria?key=${keyConfig}&showReason=true&showStrategy=true`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                entry: [
                    {
                        strategy: StrategiesType.VALUE,
                        input: 'USER_1'
                    },
                    {
                        strategy: StrategiesType.NETWORK,
                        input: '10.0.0.3'
                    }]})
            .expect(200);

        expect(req.statusCode).toBe(200);
        expect(req.body.strategies.length).toEqual(4);
        expect(req.body.reason).toEqual('Success');
        expect(req.body.result).toBe(true);
    });

    test('CLIENT_SUITE - Should NOT return success on a simple CRITERIA response - Missing input', async () => {
        const req = await request(app)
            .post(`/criteria?key=${keyConfig}&showReason=true&showStrategy=true`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                entry: [
                    {
                        strategy: StrategiesType.VALUE,
                        input: 'USER_1'
                    }]})
            .expect(200);

        expect(req.statusCode).toBe(200);
        expect(req.body.strategies.length).toEqual(4);
        expect(req.body.reason).toEqual(`Strategy '${StrategiesType.NETWORK}' does not agree`);
        expect(req.body.result).toBe(false);
    });

    test('CLIENT_SUITE - Should NOT return success on a entry-based CRITERIA response - Missing entry', async () => {
        const req = await request(app)
            .post(`/criteria?key=${keyConfig}&showReason=true&showStrategy=true`)
            .set('Authorization', `Bearer ${token}`)
            .send({})
            .expect(200);

        expect(req.statusCode).toBe(200);
        expect(req.body.strategies.length).toEqual(4);
        expect(req.body.reason).toEqual(`Strategy '${StrategiesType.VALUE}' did not receive any input`);
        expect(req.body.result).toBe(false);
    });

    test('CLIENT_SUITE - Should NOT return success on a entry-based CRITERIA response - Entry not an array', async () => {
        await request(app)
            .post(`/criteria?key=${keyConfig}&showReason=true&showStrategy=true`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                entry: {
                    strategy: StrategiesType.VALUE,
                    input: 'USER_1'
                }})
            .expect(422);
    });

    test('CLIENT_SUITE - Should NOT return success on a entry-based CRITERIA response - Invalid Strategy', async () => {
        await request(app)
            .post(`/criteria?key=${keyConfig}&showReason=true&showStrategy=true`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                entry: [
                    {
                        strategy: 'INVALID_STRATEGY',
                        input: 'USER_1'
                    }
                ]})
            .expect(422);
    });

    test('CLIENT_SUITE - Should NOT return success on a entry-based CRITERIA response - Missing key', async () => {
        await request(app)
            .post('/criteria?showReason=true&showStrategy=true')
            .set('Authorization', `Bearer ${token}`)
            .send({
                entry: [
                    {
                        strategy: StrategiesType.VALUE,
                        input: 'USER_1'
                    }
                ]})
            .expect(422);
    });

    test('CLIENT_SUITE - Should NOT return success on a entry-based CRITERIA response - Component not registered', async () => {
        // Given
        const component = new Component({
            _id: new mongoose.Types.ObjectId(),
            name: 'Temp Component',
            description: 'Temporary component',
            domain: domainId,
            owner: adminMasterAccountId
        });
        
        const generatedApiKey = await component.generateApiKey();
        const response = await request(app)
            .post('/criteria/auth')
            .set('switcher-api-key', `${generatedApiKey}`)
            .send({
                domain: domainDocument.name,
                component: component.name,
                environment: EnvType.DEFAULT
            }).expect(200);

        const tempToken = response.body.token;

        // Test
        const req = await request(app)
            .post(`/criteria?key=${keyConfig}&showReason=true&showStrategy=true`)
            .set('Authorization', `Bearer ${tempToken}`)
            .send({
                entry: [
                    {
                        strategy: StrategiesType.VALUE,
                        input: 'USER_1'
                    },
                    {
                        strategy: StrategiesType.NETWORK,
                        input: '10.0.0.3'
                    }]});

        expect(req.statusCode).toBe(401);
        expect(req.body.error).toEqual(`Component ${component.name} is not registered to ${keyConfig}`);
    });

    test('CLIENT_SUITE - Should NOT return success on a simple CRITERIA response - Bad login input', async () => {
        const req = await request(app)
            .post(`/criteria?key=${keyConfig}&showReason=true`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                entry: [
                    {
                        strategy: StrategiesType.VALUE,
                        input: 'USER_4'
                    },
                    {
                        strategy: StrategiesType.NETWORK,
                        input: '10.0.0.3'
                    }]});

        expect(req.statusCode).toBe(200);
        expect(req.body.strategies).toBe(undefined);
        expect(req.body.reason).toEqual(`Strategy '${StrategiesType.VALUE}' does not agree`);
        expect(req.body.result).toBe(false);
    });

    test('CLIENT_SUITE - Should NOT return success on a simple CRITERIA response - Invalid KEY', async () => {
        const req = await request(app)
            .post('/criteria?key=INVALID_KEY&showReason=true')
            .set('Authorization', `Bearer ${token}`)
            .send({
                entry: [
                    {
                        strategy: StrategiesType.VALUE,
                        input: 'USER_1'
                    },
                    {
                        strategy: StrategiesType.NETWORK,
                        input: '10.0.0.3'
                    }]});

        expect(req.statusCode).toBe(404);
    });

    test('CLIENT_SUITE - Should NOT return due to a API Key change, then it should return after renewing the token', async () => {
        const firstResponse = await request(app)
            .post(`/criteria?key=${keyConfig}&showReason=true&showStrategy=true`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                entry: [
                    {
                        strategy: StrategiesType.VALUE,
                        input: 'USER_1'
                    },
                    {
                        strategy: StrategiesType.NETWORK,
                        input: '10.0.0.3'
                    }]})
            .expect(200);
    
        expect(firstResponse.body.strategies.length).toEqual(4);
        expect(firstResponse.body.reason).toEqual('Success');
        expect(firstResponse.body.result).toBe(true);

        const responseNewApiKey = await request(app)
            .get('/component/generateApiKey/' + component1._id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(201);

        const secondResponse = await request(app)
            .post(`/criteria?key=${keyConfig}&showReason=true&showStrategy=true`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                entry: [
                    {
                        strategy: StrategiesType.VALUE,
                        input: 'USER_1'
                    },
                    {
                        strategy: StrategiesType.NETWORK,
                        input: '10.0.0.3'
                    }]})
            .expect(401);

        expect(secondResponse.body.error).toEqual('Invalid API token.');

        const responseNewToken = await request(app)
            .post('/criteria/auth')
            .set('switcher-api-key', `${responseNewApiKey.body.apiKey}`)
            .send({
                domain: domainDocument.name,
                component: component1.name,
                environment: EnvType.DEFAULT
            }).expect(200);

        token = responseNewToken.body.token;

        await request(app)
            .post(`/criteria?key=${keyConfig}&showReason=true&showStrategy=true`)
            .set('Authorization', `Bearer ${token}`)
            .send({
                entry: [
                    {
                        strategy: StrategiesType.VALUE,
                        input: 'USER_1'
                    },
                    {
                        strategy: StrategiesType.NETWORK,
                        input: '10.0.0.3'
                    }]})
            .expect(200);
        
    });

    test('CLIENT_SUITE - Should NOT return due to invalid API key provided', async () => {
        await request(app)
            .post('/criteria/auth')
            .set('switcher-api-key', 'INVALID_API_KEY')
            .send({
                domain: domainDocument.name,
                component: component1.name,
                environment: EnvType.DEFAULT
            }).expect(401);
    });

    test('CLIENT_SUITE - Should return that snapshot version is outdated - status = false', async () => {
        const req = await request(app)
            .get('/criteria/snapshot_check/1')
            .set('Authorization', `Bearer ${token}`)
            .send();

        expect(req.statusCode).toBe(200);
        expect(req.body.status).toEqual(false);
    });

    test('CLIENT_SUITE - Should return that snapshot version is updated - status = true', async () => {
        const req = await request(app)
            .get('/criteria/snapshot_check/5')
            .set('Authorization', `Bearer ${token}`)
            .send();

        expect(req.statusCode).toBe(200);
        expect(req.body.status).toEqual(true);
    });

    test('CLIENT_SUITE - Should return error when validating snapshot version - Version is not a number', async () => {
        const req = await request(app)
            .get('/criteria/snapshot_check/ONLY_NUMBER_ALLOWED')
            .set('Authorization', `Bearer ${token}`)
            .send();

        expect(req.statusCode).toBe(422);
        expect(req.body.errors[0].msg).toEqual('Wrong value for domain version');
    });

    test('CLIENT_SUITE - Should return error when validating snapshot version - Invalid token', async () => {
        const req = await request(app)
            .get('/criteria/snapshot_check/5')
            .set('Authorization', 'Bearer INVALID_TOKEN')
            .send();

        expect(req.statusCode).toBe(401);
        expect(req.body.error).toEqual('Invalid API token.');
    });

    test('CLIENT_SUITE - Should return an empty list of switchers - all switchers queried found', async () => {
        const req = await request(app)
            .post('/criteria/switchers_check')
            .set('Authorization', `Bearer ${token}`)
            .send({
                switchers: [
                    'TEST_CONFIG_KEY'
                ]
            });

        expect(req.statusCode).toBe(200);
        expect(req.body.not_found).toEqual([]);
    });

    test('CLIENT_SUITE - Should return the switcher queried - not found', async () => {
        const req = await request(app)
            .post('/criteria/switchers_check')
            .set('Authorization', `Bearer ${token}`)
            .send({
                switchers: [
                    'TEST_CONFIG_KEY',
                    'I_DO_NOT_EXIST'
                ]
            });

        expect(req.statusCode).toBe(200);
        expect(req.body.not_found).toEqual(['I_DO_NOT_EXIST']);
    });

    test('CLIENT_SUITE - Should NOT return list of switchers - Invalid body attribute', async () => {
        await request(app)
            .post('/criteria/switchers_check')
            .set('Authorization', `Bearer ${token}`)
            .send({
                switchers: 'TEST_CONFIG_KEY'
            })
            .expect(422);

        await request(app)
            .post('/criteria/switchers_check')
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(422);
    });
});

describe('Testing criteria [REST] Rate Limit ', () => {
    let token;

    beforeAll(async () => {
        process.env.MAX_REQUEST_PER_MINUTE = 1;
        
        await setupDatabase();
        const response = await createRequestAuth();
        token = response.body.token;
    });

    afterAll(() => {
        process.env.MAX_REQUEST_PER_MINUTE = 0;
    });

    test('CLIENT_SUITE - Should limit run to 1 execution', async () => {
        await request(app)
            .post(`/criteria?key=${keyConfig}`)
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(200);

        const req = await request(app)
            .post(`/criteria?key=${keyConfig}`)
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(429);

        expect(req.body.error).toBe('API request per minute quota exceeded');
    });
});

describe('Testing domain [Adm-GraphQL] ', () => {

    afterAll(setupDatabase);

    test('CLIENT_SUITE - Should return domain structure', async () => {
        const req = await request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(graphqlUtils.domainQuery([['name', 'Domain']]));

        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).toMatchObject(JSON.parse(graphqlUtils.expected106));
    });

    test('CLIENT_SUITE - Should return domain structure for a team member', async () => {
        const req = await request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .send(graphqlUtils.domainQuery([['_id', domainId], ['environment', EnvType.DEFAULT]]));

        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).toMatchObject(JSON.parse(graphqlUtils.expected107));
    });

    test('CLIENT_SUITE - Should NOT return domain structure - Missing query params', async () => {
        const req = await request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .send(graphqlUtils.domainQuery([['environment', EnvType.DEFAULT]]));

        const expected = '{"data":{"domain":null}}';
        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).toMatchObject(JSON.parse(expected));
    });

    test('CLIENT_SUITE - Should return domain Flat-structure - By Switcher Key', async () => {
        const req = await request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(graphqlUtils.configurationQuery([['domain', domainId], ['key', keyConfig]]));

        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).toMatchObject(JSON.parse(graphqlUtils.expected108));
    });

    test('CLIENT_SUITE - Should return domain Flat-structure - By Switcher Id', async () => {
        const req = await request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(graphqlUtils.configurationQuery([['domain', domainId], ['config_id', configId]]));

        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).toMatchObject(JSON.parse(graphqlUtils.expected108));
    });

    test('CLIENT_SUITE - Should return domain Flat-structure - By Group', async () => {
        const req = await request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(graphqlUtils.configurationQuery([['domain', domainId], ['group', 'Group Test']]));

        const result = JSON.parse(req.text);
        expect(req.statusCode).toBe(200);
        expect(result.data.configuration.group[0].name).toEqual('Group Test');
    });

    test('CLIENT_SUITE - Should return domain Flat-structure - By Group Id', async () => {
        const req = await request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(graphqlUtils.configurationQuery([['domain', domainId], ['group_id', groupConfigId]]));

        const result = JSON.parse(req.text);
        expect(req.statusCode).toBe(200);
        expect(result.data.configuration.group[0].name).toEqual('Group Test');
    });

    test('CLIENT_SUITE - Should return domain Flat-structure for a team member', async () => {
        const req = await request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .send(graphqlUtils.configurationQuery([
                ['domain', domainId], 
                ['key', keyConfig], 
                ['environment', EnvType.DEFAULT]]));

        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).toMatchObject(JSON.parse(graphqlUtils.expected109));
    });

    test('CLIENT_SUITE - Should return domain Flat-structure - By domain',  async () => {
        const req = await request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .send(graphqlUtils.configurationQuery([
                ['domain', domainId]]));

        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).toMatchObject(JSON.parse(graphqlUtils.expected110));
    });

    test('CLIENT_SUITE - Should return environments Flat-structure - By Slack Team ID', async () => {
        const req = await request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .send(graphqlUtils.configurationQuery([
                ['slack_team_id', slack.team_id]], false, false, false, false, true));
                
        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).toMatchObject(JSON.parse(graphqlUtils.expected111));
    });

    test('CLIENT_SUITE - Should return list of Groups permissions', async () => {
        const req = await request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(graphqlUtils.permissionsQuery(domainId, undefined, '"UPDATE","DELETE"', RouterTypes.GROUP));

        const exptected = '[{"action":"UPDATE","result":"ok"},{"action":"DELETE","result":"ok"}]';
        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).not.toBe(null);
        expect(JSON.parse(req.text).data.permission[0].name).toBe('Group Test');
        expect(JSON.parse(req.text).data.permission[0].permissions).toMatchObject(JSON.parse(exptected));
    });

    test('CLIENT_SUITE - Should return list of Groups permissions - from cache', async () => {
        const cacheSpy = sinon.spy(permissionCache, 'get');
        permissionCache.permissionReset(domainId, ActionTypes.UPDATE, RouterTypes.GROUP);

        await request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(graphqlUtils.permissionsQuery(domainId, undefined, '"UPDATE","DELETE"', RouterTypes.GROUP));

        expect(cacheSpy.callCount).toBe(0);
        
        const req = await request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(graphqlUtils.permissionsQuery(domainId, undefined, '"UPDATE","DELETE"', RouterTypes.GROUP));

        const exptected = '[{"action":"UPDATE","result":"ok"},{"action":"DELETE","result":"ok"}]';
        expect(req.statusCode).toBe(200);
        expect(cacheSpy.callCount).toBe(1);
        expect(JSON.parse(req.text)).not.toBe(null);
        expect(JSON.parse(req.text).data.permission[0].name).toBe('Group Test');
        expect(JSON.parse(req.text).data.permission[0].permissions).toMatchObject(JSON.parse(exptected));
    });

    test('CLIENT_SUITE - Should return list of Groups permissions - by environment', async () => {
        const req = await request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .send(graphqlUtils.permissionsQuery(domainId, undefined, '"CREATE"', RouterTypes.GROUP, EnvType.DEFAULT));
        
        const exptected = '[{"action":"CREATE","result":"ok"}]';
        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).not.toBe(null);
        expect(JSON.parse(req.text).data.permission[0].name).toBe('Group Test');
        expect(JSON.parse(req.text).data.permission[0].permissions).toMatchObject(JSON.parse(exptected));
    });

    test('CLIENT_SUITE - Should return list of Groups permissions - Unauthorized access', async () => {
        const req = await request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .send(graphqlUtils.permissionsQuery(domainId, undefined, '"UPDATE","DELETE"', RouterTypes.GROUP));

        const exptected = '[{"action":"UPDATE","result":"nok"},{"action":"DELETE","result":"nok"}]';
        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).not.toBe(null);
        expect(JSON.parse(req.text).data.permission[0].name).toBe('Group Test');
        expect(JSON.parse(req.text).data.permission[0].permissions).toMatchObject(JSON.parse(exptected));
    });

    test('CLIENT_SUITE - Should return list of Configs permissions', async () => {
        const req = await request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(graphqlUtils.permissionsQuery(domainId, groupConfigId, '"UPDATE","DELETE"', RouterTypes.CONFIG));

        const exptected = '[{"action":"UPDATE","result":"ok"},{"action":"DELETE","result":"ok"}]';
        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).not.toBe(null);
        expect(JSON.parse(req.text).data.permission[0].name).toBe('TEST_CONFIG_KEY');
        expect(JSON.parse(req.text).data.permission[1].name).toBe('TEST_CONFIG_KEY_PRD_QA');
        expect(JSON.parse(req.text).data.permission[0].permissions).toMatchObject(JSON.parse(exptected));
        expect(JSON.parse(req.text).data.permission[1].permissions).toMatchObject(JSON.parse(exptected));
    });

    test('CLIENT_SUITE - Should return list of Configs permissions - Unauthorized access', async () => {
        const req = await request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .send(graphqlUtils.permissionsQuery(domainId, groupConfigId, '"UPDATE","DELETE"', RouterTypes.CONFIG));

        const exptected = '[{"action":"UPDATE","result":"nok"},{"action":"DELETE","result":"nok"}]';
        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).not.toBe(null);
        expect(JSON.parse(req.text).data.permission[0].name).toBe('TEST_CONFIG_KEY');
        expect(JSON.parse(req.text).data.permission[1].name).toBe('TEST_CONFIG_KEY_PRD_QA');
        expect(JSON.parse(req.text).data.permission[0].permissions).toMatchObject(JSON.parse(exptected));
        expect(JSON.parse(req.text).data.permission[1].permissions).toMatchObject(JSON.parse(exptected));
    });

    test('CLIENT_SUITE - Should NOT return list of permissions - Invalid router', async () => {
        const req = await request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .send(graphqlUtils.permissionsQuery(domainId, undefined, '"UPDATE","DELETE"', RouterTypes.DOMAIN));

        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).not.toBe(null);
        expect(JSON.parse(req.text).data.permission).toStrictEqual([]);
    });
});

describe('Testing domain/configuration [Adm-GraphQL] - Excluded team member ', () => {

    afterAll(setupDatabase);

    test('CLIENT_SUITE - Should NOT return domain structure for an excluded team member', async () => {
        //given
        const admin = await Admin.findById(adminAccountId).exec();
        admin.teams = [];
        await admin.save();
        
        const req = await request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .send(graphqlUtils.domainQuery([['_id', domainId], ['environment', EnvType.DEFAULT]]));

        const expected = '{"data":{"domain":null}}';
        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).toMatchObject(JSON.parse(expected));
    });

    test('CLIENT_SUITE - Should NOT return domain Flat-structure for am excluded team member', async () => {
        const req = await request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .send(graphqlUtils.configurationQuery([
                ['domain', domainId], 
                ['key', keyConfig], 
                ['environment', EnvType.DEFAULT]]));

        const expected = '{"data":{"configuration":{"domain":null,"group":null,"config":null,"strategies":null}}}';
        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).toMatchObject(JSON.parse(expected));
    });
    
});