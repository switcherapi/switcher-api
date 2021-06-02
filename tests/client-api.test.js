import mongoose from 'mongoose';
import request from 'supertest';
import bcrypt from 'bcrypt';
import app from '../src/app';
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
    const strategy = await ConfigStrategy.findById(strategyId);
    strategy.operation = newOperation ? newOperation : strategy.operation;
    strategy.activated.set(environment, status !== undefined ? status : strategy.activated.get(environment));
    strategy.updatedBy = adminMasterAccountId;
    await strategy.save();
};

const changeConfigStatus = async (configId, status, environment) => {
    const config = await Config.findById(configId);
    config.activated.set(environment, status !== undefined ? status : config.activated.get(environment));
    config.updatedBy = adminMasterAccountId;
    await config.save();
};

const changeConfigDisableMetricFlag = async (configId, status, environment) => {
    const config = await Config.findById(configId);
    if (!config.disable_metrics)
        config.disable_metrics = new Map;

    config.disable_metrics.set(environment, status);
    config.updatedBy = adminMasterAccountId;
    await config.save();
};

const changeGroupConfigStatus = async (groupConfigId, status, environment) => {
    const groupConfig = await GroupConfig.findById(groupConfigId);
    groupConfig.activated.set(environment, status !== undefined ? status : groupConfig.activated.get(environment));
    groupConfig.updatedBy = adminMasterAccountId;
    await groupConfig.save();
};

const changeDomainStatus = async (domainId, status, environment) => {
    const domain = await Domain.findById(domainId);
    domain.activated.set(environment, status !== undefined ? status : domain.activated.get(environment));
    domain.updatedBy = adminMasterAccountId;
    await domain.save();
};

beforeAll(setupDatabase);

afterAll(async () => { 
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mongoose.disconnect();
});

describe('Testing criteria [GraphQL] ', () => {
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

    test('CLIENT_SUITE - Should return success on a simple CRITERIA response', (done) => {
        request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.criteriaQuery(keyConfig, graphqlUtils.buildEntries([
                [StrategiesType.VALUE, 'USER_1'], 
                [StrategiesType.NETWORK, '10.0.0.3']]))
            )
            .expect(200)
            .end((err, res) => {
                const expected = graphqlUtils.criteriaResult('true', 'Success');
                expect(JSON.parse(res.text)).toMatchObject(JSON.parse(expected));
                done();
            });
    });

    test('CLIENT_SUITE - Should return success on Flat view resolved by Group name', (done) => {
        request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.configurationQuery([['group', 'Group Test']]))
            .expect(200)
            .end((err, res) => {
                expect(JSON.parse(res.text)).toMatchObject(JSON.parse(graphqlUtils.expected100));
                done();
            });
    });

    test('CLIENT_SUITE - Should NOT return on Flat view resolved by an unknown Group name', (done) => {
        request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.configurationQuery([['group', 'UNKNOWN GROUP NAME']]))
            .expect(200)
            .end((err, res) => {
                expect(JSON.parse(res.text).data.configuration).toEqual(null);
                done();
            });
    });

    test('CLIENT_SUITE - Should return success on Flat view resolved by Config Key', (done) => {
        request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.configurationQuery([['key', keyConfig]]))
            .expect(200)
            .end((err, res) => {
                expect(JSON.parse(res.text)).toMatchObject(JSON.parse(graphqlUtils.expected101));
                done();
            });
    });

    test('CLIENT_SUITE - Should return success on Flat view resolved by Config Key - Uncovered environment, should look to production', async () => {
        const response = await request(app)
            .post('/criteria/auth')
            .set('switcher-api-key', `${apiKey}`)
            .send({
                domain: domainDocument.name,
                component: component1.name,
                environment: 'UNKNOWN ENVIRONMENT'
            }).expect(200);

        await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${response.body.token}`)
            .send(graphqlUtils.configurationQuery([['key', keyConfig]]))
            .expect(200);
    });

    test('CLIENT_SUITE - Should NOT return on Flat view resolved by an unknown Config Key', (done) => {
        request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.configurationQuery([['key', 'UNKNOWN_CONFIG_KEY']]))
            .expect(200)
            .end((err, res) => {
                expect(JSON.parse(res.text).data.configuration).toEqual(null);
                done();
            });
    });

    test('CLIENT_SUITE - Should NOT return success on a simple CRITERIA response - Bad login input', (done) => {
        request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.criteriaQuery(keyConfig, graphqlUtils.buildEntries([
                [StrategiesType.VALUE, 'USER_4'], 
                [StrategiesType.NETWORK, '10.0.0.3']]))
            )
            .expect(200)
            .end((err, res) => {
                const expected = graphqlUtils.criteriaResult('false', `Strategy '${StrategiesType.VALUE}' does not agree`);
                expect(JSON.parse(res.text)).toMatchObject(JSON.parse(expected));
                done();
            });
    });

    test('CLIENT_SUITE - Should NOT return success on a simple CRITERIA response - Missing input', (done) => {
        request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.criteriaQuery(keyConfig, graphqlUtils.buildEntries([
                [StrategiesType.VALUE, 'USER_2']]))
            )
            .expect(200)
            .end((err, res) => {
                const expected = graphqlUtils.criteriaResult('false', `Strategy '${StrategiesType.NETWORK}' did not receive any input`);
                expect(JSON.parse(res.text)).toMatchObject(JSON.parse(expected));
                done();
            });
    });

    test('CLIENT_SUITE - Should NOT return success on a simple CRITERIA response - Invalid KEY', (done) => {
        request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.criteriaQuery('INVALID_KEY', graphqlUtils.buildEntries([
                [StrategiesType.VALUE, 'USER_1'],
                [StrategiesType.NETWORK, '10.0.0.3']]))
            )
            .expect(200)
            .end((err, res) => {
                expect(JSON.parse(res.text).data.criteria).toEqual(null);
                done();
            });
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
        const numMetricData = await Metric.find({ config: configId }).countDocuments();

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
        const afterNumMetricData = await Metric.find({ config: configId }).countDocuments();
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

    test('CLIENT_SUITE - Should return the Domain structure', (done) => {
        request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.domainQuery([['_id', domainId]], true, true, true))
            .expect(200)
            .end((err, res) => {
                expect(JSON.parse(res.text)).toMatchObject(JSON.parse(graphqlUtils.expected102));
                done();
            });
    });

    test('CLIENT_SUITE - Should return 2 switchers when NOT filtered by Component', (done) => {
        request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.domainQuery([
                ['name', domainDocument.name], 
                ['environment', EnvType.DEFAULT]])
            )
            .expect(200)
            .end((err, res) => {
                const result = JSON.parse(res.text);
                expect(result.data.domain.group[0].config.length).toBe(2);
                done();
            });
    });

    test('CLIENT_SUITE - Should return 1 switcher when filtered by Component', (done) => {
        request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.domainQuery([
                ['name', domainDocument.name], 
                ['environment', EnvType.DEFAULT],
                ['_component', 'TestApp']])
            )
            .expect(200)
            .end((err, res) => {
                const result = JSON.parse(res.text);
                expect(result.data.domain.group[0].config.length).toBe(1);
                done();
            });
    });

    test('CLIENT_SUITE - Should return the Domain structure - Just using environment', (done) => {
        // Domain will be resolved while identifying the component
        request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.domainQuery([
                ['name', domainDocument.name], 
                ['environment', EnvType.DEFAULT]], true, true, true)
            )
            .expect(200)
            .end((err, res) => {
                expect(JSON.parse(res.text)).toMatchObject(JSON.parse(graphqlUtils.expected102));
                done();
            });
    });

    test('CLIENT_SUITE - Should return the Domain structure - Disabling strategies (resolver test)', (done) => {
        request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.domainQuery([['_id', domainId]], true, true, false))
            .expect(200)
            .end((err, res) => {
                expect(JSON.parse(res.text)).toMatchObject(JSON.parse(graphqlUtils.expected103));
                done();
            });
    });

    test('CLIENT_SUITE - Should return the Domain structure - Disabling group config (resolver test)', (done) => {
        request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.domainQuery([['_id', domainId]], false, false, false))
            .expect(200)
            .end((err, res) => {
                expect(JSON.parse(res.text)).toMatchObject(JSON.parse(graphqlUtils.expected104));
                done();
            });
    });

    test('CLIENT_SUITE - Should return the Domain structure - Disabling config (resolver test)', (done) => {
        request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.domainQuery([['_id', domainId]], true, false, false))
            .expect(200)
            .end((err, res) => {
                expect(JSON.parse(res.text)).toMatchObject(JSON.parse(graphqlUtils.expected105(keyConfigPrdQA)));
                done();
            });
    });
});

describe('Testing criteria [REST] ', () => {
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

    test('CLIENT_SUITE - Should return success on a entry-based CRITERIA response', (done) => {
        request(app)
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
            .expect(200)
            .end((err, { body }) => {
                expect(body.strategies.length).toEqual(4);
                expect(body.reason).toEqual('Success');
                expect(body.result).toBe(true);
                done();
            });
    });

    test('CLIENT_SUITE - Should NOT return success on a entry-based CRITERIA response - Component not registered', async (done) => {
        //given
        const component = {
            _id: new mongoose.Types.ObjectId(),
            name: 'Temp Component',
            description: 'Temporary component',
            domain: domainId,
            owner: adminMasterAccountId
        };

        const apiKey = await bcrypt.hash(component._id + component.name, 8);
        const hash = await bcrypt.hash(apiKey, 8);
        component.apihash = hash;
        await new Component(component).save();

        const response = await request(app)
            .post('/criteria/auth')
            .set('switcher-api-key', `${apiKey}`)
            .send({
                domain: domainDocument.name,
                component: component.name,
                environment: EnvType.DEFAULT
            }).expect(200);

        const tempToken = response.body.token;

        //test
        request(app)
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
                    }]})
            .expect(200)
            .end((err, { body }) => {
                expect(body.error).toEqual(`Component ${component.name} is not registered to ${keyConfig}`);
                done();
            });
    });

    test('CLIENT_SUITE - Should NOT return success on a simple CRITERIA response - Bad login input', (done) => {
        request(app)
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
                    }]})
            .expect(200)
            .end((err, { body }) => {
                expect(body.strategies).toBe(undefined);
                expect(body.reason).toEqual(`Strategy '${StrategiesType.VALUE}' does not agree`);
                expect(body.result).toBe(false);
                done();
            });
    });

    test('CLIENT_SUITE - Should NOT return success on a simple CRITERIA response - Invalid KEY', (done) => {
        request(app)
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
                    }]})
            .expect(404)
            .end(() => {
                done();
            });
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

    test('CLIENT_SUITE - Should return that snapshot version is outdated - status = false', (done) => {
        request(app)
            .get('/criteria/snapshot_check/1')
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(200)
            .end((err, { body }) => {
                expect(body.status).toEqual(false);
                done();
            });
    });

    test('CLIENT_SUITE - Should return that snapshot version is updated - status = true', (done) => {
        request(app)
            .get('/criteria/snapshot_check/5')
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(200)
            .end((err, { body }) => {
                expect(body.status).toEqual(true);
                done();
            });
    });

    test('CLIENT_SUITE - Should return error when validating snapshot version - Version is not a number', (done) => {
        request(app)
            .get('/criteria/snapshot_check/ONLY_NUMBER_ALLOWED')
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(400)
            .end((err, { body }) => {
                expect(body.error).toEqual('Wrong value for domain version');
                done();
            });
    });

    test('CLIENT_SUITE - Should return error when validating snapshot version - Invalid token', (done) => {
        request(app)
            .get('/criteria/snapshot_check/5')
            .set('Authorization', 'Bearer INVALID_TOKEN')
            .send()
            .expect(500)
            .end((err, { body }) => {
                expect(body.error).toEqual('Invalid API token.');
                done();
            });
    });

    test('CLIENT_SUITE - Should return an empty list of switchers - all switchers queried found', (done) => {
        request(app)
            .post('/criteria/switchers_check')
            .set('Authorization', `Bearer ${token}`)
            .send({
                switchers: [
                    'TEST_CONFIG_KEY'
                ]
            })
            .expect(200)
            .end((err, { body }) => {
                expect(body.not_found).toEqual([]);
                done();
            });
    });

    test('CLIENT_SUITE - Should return the switcher queried - not found', (done) => {
        request(app)
            .post('/criteria/switchers_check')
            .set('Authorization', `Bearer ${token}`)
            .send({
                switchers: [
                    'TEST_CONFIG_KEY',
                    'I_DO_NOT_EXIST'
                ]
            })
            .expect(200)
            .end((err, { body }) => {
                expect(body.not_found).toEqual(['I_DO_NOT_EXIST']);
                done();
            });
    });
});

describe('Testing domain [Adm-GraphQL] ', () => {

    afterAll(setupDatabase);

    test('CLIENT_SUITE - Should return domain structure', (done) => {
        request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(graphqlUtils.domainQuery([['name', 'Domain']]))
            .expect(200)
            .end((err, res) => {
                expect(JSON.parse(res.text)).toMatchObject(JSON.parse(graphqlUtils.expected106));
                done();
            });
    });

    test('CLIENT_SUITE - Should return domain structure for a team member', (done) => {
        request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .send(graphqlUtils.domainQuery([['_id', domainId], ['environment', EnvType.DEFAULT]]))
            .expect(200)
            .end((err, res) => {
                expect(JSON.parse(res.text)).toMatchObject(JSON.parse(graphqlUtils.expected107));
                done();
            });
    });

    test('CLIENT_SUITE - Should return domain Flat-structure - By Switcher Key', (done) => {
        request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(graphqlUtils.configurationQuery([['domain', domainId], ['key', keyConfig]]))
            .expect(200)
            .end((err, res) => {
                expect(JSON.parse(res.text)).toMatchObject(JSON.parse(graphqlUtils.expected108));
                done();
            });
    });

    test('CLIENT_SUITE - Should return domain Flat-structure - By Group', (done) => {
        request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(graphqlUtils.configurationQuery([['domain', domainId], ['group', 'Group Test']]))
            .expect(200)
            .end((err, res) => {
                const result = JSON.parse(res.text);
                expect(result.data.configuration.group[0].name).toEqual('Group Test');
                done();
            });
    });

    test('CLIENT_SUITE - Should return domain Flat-structure for a team member', (done) => {
        request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .send(graphqlUtils.configurationQuery([
                ['domain', domainId], 
                ['key', keyConfig], 
                ['environment', EnvType.DEFAULT]]))
            .expect(200)
            .end((err, res) => {
                expect(JSON.parse(res.text)).toMatchObject(JSON.parse(graphqlUtils.expected109));
                done();
            });
    });

    test('CLIENT_SUITE - Should return domain Flat-structure - By domain', (done) => {
        request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .send(graphqlUtils.configurationQuery([
                ['domain', domainId]]))
            .expect(200)
            .end((err, res) => {
                expect(JSON.parse(res.text)).toMatchObject(JSON.parse(graphqlUtils.expected110));
                done();
            });
    });

    test('CLIENT_SUITE - Should return environments Flat-structure - By Slack Team ID', (done) => {
        request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .send(graphqlUtils.configurationQuery([
                ['slack_team_id', slack.team_id]], false, false, false, false, true))
            .expect(200)
            .end((err, res) => {
                expect(JSON.parse(res.text)).toMatchObject(JSON.parse(graphqlUtils.expected111));
                done();
            });
    });

    test('CLIENT_SUITE - Should NOT return domain structure for an excluded team member', async (done) => {
        //given
        const admin = await Admin.findById(adminAccountId);
        admin.teams = [];
        await admin.save();
        
        request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .send(graphqlUtils.domainQuery([['_id', domainId], ['environment', EnvType.DEFAULT]]))
            .expect(200)
            .end((err, res) => {
                const expected = '{"data":{"domain":null}}';
                expect(JSON.parse(res.text)).toMatchObject(JSON.parse(expected));
                done();
            });
    });

    test('CLIENT_SUITE - Should NOT return domain Flat-structure for am excluded team member', (done) => {
        request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .send(graphqlUtils.configurationQuery([
                ['domain', domainId], 
                ['key', keyConfig], 
                ['environment', EnvType.DEFAULT]]))
            .expect(200)
            .end((err, res) => {
                const expected = '{"data":{"configuration":{"domain":null,"group":null,"config":null,"strategies":null}}}';
                expect(JSON.parse(res.text)).toMatchObject(JSON.parse(expected));
                done();
            });
    });
});