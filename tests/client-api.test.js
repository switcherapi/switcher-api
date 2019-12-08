import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app';
import Domain from '../src/models/domain';
import GroupConfig from '../src/models/group-config';
import Config from '../src/models/config';
import { ConfigStrategy, StrategiesType, OperationsType } from '../src/models/config-strategy';
import { 
    setupDatabase,
    domainPrdToken,
    domainQAToken,
    keyConfig,
    configId,
    groupConfigId,
    domainId,
    configStrategyUSERId
} from './fixtures/db_client';
import { EnvType } from '../src/models/environment';

const changeStrategy = async (strategyId, newOperation, status, environment) => {
    const strategy = await ConfigStrategy.findById(strategyId)
    strategy.operation = newOperation ? newOperation : strategy.operation
    strategy.activated.set(environment, status !== undefined ? status : strategy.activated.get(environment))
    await strategy.save()
}

const changeConfigStatus = async (configId, status, environment) => {
    const config = await Config.findById(configId)
    config.activated.set(environment, status !== undefined ? status : config.activated.get(environment))
    await config.save()
}

const changeGroupConfigStatus = async (groupConfigId, status, environment) => {
    const groupConfig = await GroupConfig.findById(groupConfigId)
    groupConfig.activated.set(environment, status !== undefined ? status : groupConfig.activated.get(environment))
    await groupConfig.save()
}

const changeDomainStatus = async (domainId, status, environment) => {
    const domain = await Domain.findById(domainId)
    domain.activated.set(environment, status !== undefined ? status : domain.activated.get(environment))
    await domain.save()
}

beforeAll(setupDatabase)

afterAll(async () => { 
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mongoose.disconnect()
})

describe("Testing criteria", () => {

    afterAll(setupDatabase)

    test('CLIENT_SUITE - Should return success on a simple CRITERIA response', (done) => {
        request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${domainPrdToken}`)
            .send({ query: `
                {
                    criteria(
                        key: "${keyConfig}", 
                        entry: [{ strategy: "${StrategiesType.VALUE}", input: "USER_1" },
                                { strategy: "${StrategiesType.NETWORK}", input: "10.0.0.3" }]
                        ) { result { return reason } }
                }  
            `})
            .expect(200)
            .end((err, res) => {
                const expected = `
                    {
                        "data": { "criteria": { "result": { "return": true, "reason": "Success" } } }
                    }`;
                
                expect(JSON.parse(res.text)).toMatchObject(JSON.parse(expected));
                done();
            })
    })

    test('CLIENT_SUITE - Should NOT return success on a simple CRITERIA response - Bad login input', (done) => {
        request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${domainPrdToken}`)
            .send({ query: `
                {
                    criteria(
                        key: "${keyConfig}", 
                        entry: [{ strategy: "${StrategiesType.VALUE}", input: "USER_4" },
                                { strategy: "${StrategiesType.NETWORK}", input: "10.0.0.3" }]
                        ) { result { return reason } }
                }  
            `})
            .expect(200)
            .end((err, res) => {
                const expected = `
                    {
                        "data": { "criteria": { "result": { "return": false, "reason": "Strategy '${StrategiesType.VALUE}' does not agree" } } }
                    }`;
                
                expect(JSON.parse(res.text)).toMatchObject(JSON.parse(expected));
                done();
            })
    })

    test('CLIENT_SUITE - Should NOT return success on a simple CRITERIA response - Missing input', (done) => {
        request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${domainPrdToken}`)
            .send({ query: `
                {
                    criteria(
                        key: "${keyConfig}", 
                        entry: [{ strategy: "${StrategiesType.VALUE}", input: "USER_2" }]
                        ) { result { return reason } }
                }  
            `})
            .expect(200)
            .end((err, res) => {
                const expected = `
                    {
                        "data": { "criteria": { "result": { "return": false, "reason": "Strategy '${StrategiesType.NETWORK}' did not receive any input" } } }
                    }`;
                
                expect(JSON.parse(res.text)).toMatchObject(JSON.parse(expected));
                done();
            })
    })

    test('CLIENT_SUITE - Should NOT return success on a simple CRITERIA response - Invalid KEY', (done) => {
        request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${domainPrdToken}`)
            .send({ query: `
                {
                    criteria(
                        key: "INVALID_KEY", 
                        entry: [{ strategy: "${StrategiesType.VALUE}", input: "USER_1" },
                                { strategy: "${StrategiesType.NETWORK}", input: "10.0.0.3" }]
                        ) { result { return reason } }
                } 
            `})
            .expect(200)
            .end((err, res) => {
                expect(JSON.parse(res.text).data.criteria).toEqual(null);
                done();
            })
    })

    test('CLIENT_SUITE - Should return config disabled for PRD environment while activated in QA', async () => {
        // Config enabled
        let response = await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${domainPrdToken}`)
            .send({ query: `
                {
                    criteria(
                        key: "${keyConfig}", 
                        entry: [{ strategy: "${StrategiesType.VALUE}", input: "USER_1" },
                                { strategy: "${StrategiesType.NETWORK}", input: "10.0.0.3" }]
                        ) { result { return reason } }
                }  
            `})
            .expect(200);

        let expected = `
            {
                "data": { "criteria": { "result": { "return": true, "reason": "Success" } } }
            }`;
        
        expect(JSON.parse(response.text)).toMatchObject(JSON.parse(expected));
    })

    test('CLIENT_SUITE - It will be deactivated on default environment', async () => {
        await changeConfigStatus(configId, false, EnvType.DEFAULT)
        const response = await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${domainPrdToken}`)
            .send({ query: `
                {
                    criteria(
                        key: "${keyConfig}", 
                        entry: [{ strategy: "${StrategiesType.VALUE}", input: "USER_1" },
                                { strategy: "${StrategiesType.NETWORK}", input: "10.0.0.3" }]
                        ) { result { return reason } }
                }  
            `})
            .expect(200);

        const expected = `
            {
                "data": { "criteria": { "result": { "return": false, "reason": "Config disabled" } } }
            }`;
        
        expect(JSON.parse(response.text)).toMatchObject(JSON.parse(expected));
    })

    test('CLIENT_SUITE - It will be activated on QA environment', async () => {
        await changeConfigStatus(configId, true, 'QA');
        const response = await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${domainQAToken}`)
            .send({ query: `
                {
                    criteria(
                        key: "${keyConfig}", 
                        entry: [{ strategy: "${StrategiesType.VALUE}", input: "USER_1" },
                                { strategy: "${StrategiesType.NETWORK}", input: "10.0.0.3" }]
                        ) { result { return reason } }
                }  
            `})
            .expect(200);

        const expected = `
            {
                "data": { "criteria": { "result": { "return": true, "reason": "Success" } } }
            }`;
        
        expect(JSON.parse(response.text)).toMatchObject(JSON.parse(expected));
    })

    test('CLIENT_SUITE - Should return false after changing strategy operation', async () => {
        await changeStrategy(configStrategyUSERId, OperationsType.NOT_EXIST, true, 'QA')
        await changeStrategy(configStrategyUSERId, undefined, false, EnvType.DEFAULT)
        const response = await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${domainQAToken}`)
            .send({ query: `
                {
                    criteria(
                        key: "${keyConfig}", 
                        entry: [{ strategy: "${StrategiesType.VALUE}", input: "USER_1" },
                                { strategy: "${StrategiesType.NETWORK}", input: "10.0.0.3" }]
                        ) { result { return reason } }
                }  
            `})
            .expect(200);

        const expected = `
            {
                "data": { "criteria": { "result": { "return": false, "reason": "Strategy '${StrategiesType.VALUE}' does not agree" } } }
            }`;
        
        expect(JSON.parse(response.text)).toMatchObject(JSON.parse(expected));
    })

    test('CLIENT_SUITE - Should return success for default environment now, since the strategy has started being specific for QA environment', async () => {
        await changeConfigStatus(configId, true, EnvType.DEFAULT);
        const response = await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${domainPrdToken}`)
            .send({ query: `
                {
                    criteria(
                        key: "${keyConfig}", 
                        entry: [{ strategy: "${StrategiesType.VALUE}", input: "USER_1" },
                                { strategy: "${StrategiesType.NETWORK}", input: "10.0.0.3" }]
                        ) { result { return reason } }
                }  
            `})
            .expect(200);

        const expected = `
            {
                "data": { "criteria": { "result": { "return": true, "reason": "Success" } } }
            }`;
        
        expect(JSON.parse(response.text)).toMatchObject(JSON.parse(expected));
    })

    test('CLIENT_SUITE - Should return false due to Group deactivation', async () => {
        await changeGroupConfigStatus(groupConfigId, false, EnvType.DEFAULT)
        const response = await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${domainPrdToken}`)
            .send({ query: `
                {
                    criteria(
                        key: "${keyConfig}", 
                        entry: [{ strategy: "${StrategiesType.VALUE}", input: "USER_1" },
                                { strategy: "${StrategiesType.NETWORK}", input: "10.0.0.3" }]
                        ) { result { return reason } }
                }  
            `})
            .expect(200);

        const expected = `
            {
                "data": { "criteria": { "result": { "return": false, "reason": "Group disabled" } } }
            }`;
        
        expect(JSON.parse(response.text)).toMatchObject(JSON.parse(expected));
    })

    test('CLIENT_SUITE - Should return false due to Domain deactivation', async () => {
        await changeGroupConfigStatus(groupConfigId, true, EnvType.DEFAULT)
        await changeDomainStatus(domainId, false, EnvType.DEFAULT)
        const response = await request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${domainPrdToken}`)
            .send({ query: `
                {
                    criteria(
                        key: "${keyConfig}", 
                        entry: [{ strategy: "${StrategiesType.VALUE}", input: "USER_1" },
                                { strategy: "${StrategiesType.NETWORK}", input: "10.0.0.3" }]
                        ) { result { return reason } }
                }  
            `})
            .expect(200);

        const expected = `
            {
                "data": { "criteria": { "result": { "return": false, "reason": "Domain disabled" } } }
            }`;
        
        expect(JSON.parse(response.text)).toMatchObject(JSON.parse(expected));
    })
})

describe("Testing domain", () => {

    afterAll(setupDatabase)

    test('CLIENT_SUITE - Should return the Domain structure', (done) => {
        request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${domainPrdToken}`)
            .send({ query: `
                {
                    domain(name: "Domain") {
                        name
                        description
                        activated
                        group(activated: true) {
                            name
                            description
                            activated
                            config(activated: true) {
                                key
                                description
                                activated
                                strategies(activated: true) {
                                    strategy
                                    activated
                                    operation
                                    values
                                }
                            }
                        }
                    }
                }
            `})
            .expect(200)
            .end((err, res) => {
                const expected = `
                        {
                            "data":{
                               "domain":[
                                  {
                                     "name":"Domain",
                                     "description":"Test Domain",
                                     "activated":true,
                                     "group":[
                                        {
                                           "name":"Group Test",
                                           "description":"Test Group",
                                           "activated":true,
                                           "config":[
                                              {
                                                 "key":"TEST_CONFIG_KEY",
                                                 "description":"Test config 1",
                                                 "activated":true,
                                                 "strategies":[
                                                    {
                                                       "strategy":"VALUE_VALIDATION",
                                                       "activated":true,
                                                       "operation":"EXIST",
                                                       "values":[
                                                          "USER_1",
                                                          "USER_2",
                                                          "USER_3"
                                                       ]
                                                    },
                                                    {
                                                       "strategy":"NETWORK_VALIDATION",
                                                       "activated":true,
                                                       "operation":"EXIST",
                                                       "values":[
                                                          "10.0.0.0/24"
                                                       ]
                                                    }
                                                 ]
                                              }
                                           ]
                                        }
                                     ]
                                  }
                               ]
                            }
                         }`;
                
                expect(JSON.parse(res.text)).toMatchObject(JSON.parse(expected));
                done();
            })
    })

    test('CLIENT_SUITE - Should return the Domain structure - Disabling strategies (resolver test)', (done) => {
        request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${domainPrdToken}`)
            .send({ query: `
                {
                    domain(name: "Domain") {
                        name
                        description
                        activated
                        group(activated: true) {
                            name
                            description
                            activated
                            config(activated: true) {
                                key
                                description
                                activated
                                strategies(activated: false) {
                                    strategy
                                    activated
                                    operation
                                    values
                                }
                            }
                        }
                    }
                }
            `})
            .expect(200)
            .end((err, res) => {
                const expected = `
                        {
                            "data":{
                               "domain":[
                                  {
                                     "name":"Domain",
                                     "description":"Test Domain",
                                     "activated":true,
                                     "group":[
                                        {
                                           "name":"Group Test",
                                           "description":"Test Group",
                                           "activated":true,
                                           "config":[
                                              {
                                                 "key":"TEST_CONFIG_KEY",
                                                 "description":"Test config 1",
                                                 "activated":true,
                                                 "strategies":[
                                                    {
                                                       "strategy":"TIME_VALIDATION",
                                                       "activated":false,
                                                       "operation":"BETWEEN",
                                                       "values":[
                                                          "13:00",
                                                          "14:00"
                                                       ]
                                                    },
                                                    {
                                                       "strategy":"DATE_VALIDATION",
                                                       "activated":false,
                                                       "operation":"GREATER",
                                                       "values":[
                                                           "2019-12-01T13:00"
                                                       ]
                                                    }
                                                 ]
                                              }
                                           ]
                                        }
                                     ]
                                  }
                               ]
                            }
                         }`;
                
                expect(JSON.parse(res.text)).toMatchObject(JSON.parse(expected));
                done();
            })
    })

    test('CLIENT_SUITE - Should return the Domain structure - Disabling group config (resolver test)', (done) => {
        request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${domainPrdToken}`)
            .send({ query: `
                {
                    domain(name: "Domain") {
                        name
                        description
                        activated
                        group(activated: false) {
                            name
                            description
                            activated
                            config(activated: false) {
                                key
                                description
                                activated
                                strategies(activated: false) {
                                    strategy
                                    activated
                                    operation
                                    values
                                }
                            }
                        }
                    }
                }
            `})
            .expect(200)
            .end((err, res) => {
                const expected = `
                        {
                            "data":{
                               "domain":[
                                  {
                                     "name":"Domain",
                                     "description":"Test Domain",
                                     "activated":true,
                                     "group":[]
                                  }
                               ]
                            }
                         }`;
                
                expect(JSON.parse(res.text)).toMatchObject(JSON.parse(expected));
                done();
            })
    })

    test('CLIENT_SUITE - Should return the Domain structure - Disabling config (resolver test)', (done) => {
        request(app)
            .post('/graphql')
            .set('Authorization', `Bearer ${domainPrdToken}`)
            .send({ query: `
                {
                    domain(name: "Domain") {
                        name
                        description
                        activated
                        group(activated: true) {
                            name
                            description
                            activated
                            config(activated: false) {
                                key
                                description
                                activated
                                strategies(activated: false) {
                                    strategy
                                    activated
                                    operation
                                    values
                                }
                            }
                        }
                    }
                }
            `})
            .expect(200)
            .end((err, res) => {
                const expected = `
                        {
                            "data":{
                               "domain":[
                                  {
                                     "name":"Domain",
                                     "description":"Test Domain",
                                     "activated":true,
                                     "group":[
                                        {
                                           "name":"Group Test",
                                           "description":"Test Group",
                                           "activated":true,
                                           "config":[]
                                        }
                                     ]
                                  }
                               ]
                            }
                         }`;
                
                expect(JSON.parse(res.text)).toMatchObject(JSON.parse(expected));
                done();
            })
    })
})