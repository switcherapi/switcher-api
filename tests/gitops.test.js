import mongoose from 'mongoose';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import { Client } from 'switcher-client';
import { Config, RelayMethods, RelayTypes } from '../src/models/config';
import GroupConfig from '../src/models/group-config';
import { ConfigStrategy, OperationsType, StrategiesType } from '../src/models/config-strategy';
import { EnvType } from '../src/models/environment';
import * as graphqlUtils from './graphql-utils';
import { 
    setupDatabase,
    domainId,
    configId
} from './fixtures/db_client';

afterAll(async () => { 
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mongoose.disconnect();
});

const generateToken = (expiresIn, subject = domainId.toString()) => {
    return jwt.sign(({ 
        iss: 'GitOps Service',
        sub: '/resource',
        subject,
    }), process.env.SWITCHER_GITOPS_JWT_SECRET, {
        expiresIn
    });
};

describe('GitOps - GraphQL', () => {
    beforeAll(setupDatabase);

    test('GITOPS_SUITE - Should return snapshot payload from GraphQL API', async () => {
        const token = generateToken('30s');
        const req = await request(app)
            .post('/gitops-graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.domainQuery([['_id', domainId]], true, true, true));

        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).toMatchObject(JSON.parse(graphqlUtils.expected102));
    });

    test('GITOPS_SUITE - Should return error when token is expired', async () => {
        const token = generateToken('0s');
        const req = await request(app)
            .post('/gitops-graphql')
            .set('Authorization', `Bearer ${token}`)
            .send(graphqlUtils.domainQuery([['_id', domainId]], true, true, true));

        expect(req.statusCode).toBe(401);
    });
});

describe('GitOps - Feature Toggle', () => {
    beforeAll(async () => {
        process.env.SWITCHER_API_ENABLE = true;
        Client.assume('GITOPS_INTEGRATION').false();
    });

    afterAll(() => {
        process.env.SWITCHER_API_ENABLE = false;
    });

    test('GITOPS_SUITE - Should return error when feature is disabled', async () => {
        const token = generateToken('30s');

        const req = await request(app)
            .post('/gitops/v1/push')
            .set('Authorization', `Bearer ${token}`)
            .send()
            .expect(400);

        expect(req.body.error).toBe('GitOps Integration is not available.');
    });
});

describe('GitOps - Push New', () => {
    beforeAll(setupDatabase);

    test('GITOPS_SUITE - Should push changes - New Group', async () => {
        const token = generateToken('30s');

        const lastUpdate = Date.now();
        const req = await request(app)
            .post('/gitops/v1/push')
            .set('Authorization', `Bearer ${token}`)
            .send({
                environment: EnvType.DEFAULT,
                changes: [{
                    action: 'NEW',
                    diff: 'GROUP',
                    path: [],
                    content: {
                        name: 'New Group',
                        description: 'New Group Description',
                        activated: true
                    }
                }]
            })
            .expect(200);

        expect(req.body.message).toBe('Changes applied successfully');
        expect(req.body.version).toBeGreaterThan(lastUpdate);

        // Check if the changes were applied
        const group = await GroupConfig.findOne({ name: 'New Group', domain: domainId }).lean().exec();
        expect(group).not.toBeNull();
        expect(group.activated[EnvType.DEFAULT]).toBe(true);
        expect(group.description).toBe('New Group Description');
    });

    test('GITOPS_SUITE - Should push changes - New Group and Switcher', async () => {
        const token = generateToken('30s');

        const lastUpdate = Date.now();
        const req = await request(app)
            .post('/gitops/v1/push')
            .set('Authorization', `Bearer ${token}`)
            .send({
                environment: EnvType.DEFAULT,
                changes: [{
                    action: 'NEW',
                    diff: 'GROUP',
                    path: [],
                    content: {
                        name: 'New Group and Switcher',
                        description: 'New Group Description',
                        activated: true,
                        config: [{
                            key: 'NEW_SWITCHER_FROM_GROUP',
                            description: 'New Switcher',
                            activated: false,
                            components: ['TestApp']
                        }]
                    }
                }]
            })
            .expect(200);

        expect(req.body.message).toBe('Changes applied successfully');
        expect(req.body.version).toBeGreaterThan(lastUpdate);

        // Check if the changes were applied
        const group = await GroupConfig.findOne({ name: 'New Group and Switcher', domain: domainId }).lean().exec();
        expect(group).not.toBeNull();
        expect(group.activated[EnvType.DEFAULT]).toBe(true);
        expect(group.description).toBe('New Group Description');

        const config = await Config.findOne({ key: 'NEW_SWITCHER_FROM_GROUP', domain: domainId }).lean().exec();
        expect(config).not.toBeNull();
        expect(config.activated[EnvType.DEFAULT]).toBe(false);
        expect(config.description).toBe('New Switcher');
        expect(config.components).toHaveLength(1);
    });

    test('GITOPS_SUITE - Should push changes - New Switcher', async () => {
        const token = generateToken('30s');

        const lastUpdate = Date.now();
        const req = await request(app)
            .post('/gitops/v1/push')
            .set('Authorization', `Bearer ${token}`)
            .send({
                environment: EnvType.DEFAULT,
                changes: [{
                    action: 'NEW',
                    diff: 'CONFIG',
                    path: [
                        'Group Test'
                    ],
                    content: {
                        key: 'NEW_SWITCHER',
                        activated: true
                    }
                }]
            })
            .expect(200);

        expect(req.body.message).toBe('Changes applied successfully');
        expect(req.body.version).toBeGreaterThan(lastUpdate);

        // Check if the changes were applied
        const config = await Config.findOne({ key: 'NEW_SWITCHER', domain: domainId }).lean().exec();
        expect(config).not.toBeNull();
        expect(config.activated[EnvType.DEFAULT]).toBe(true);
        expect(config.components).toHaveLength(0);
    });

    test('GITOPS_SUITE - Should push changes - New Switcher and Relay', async () => {
        const token = generateToken('30s');

        const lastUpdate = Date.now();
        const req = await request(app)
            .post('/gitops/v1/push')
            .set('Authorization', `Bearer ${token}`)
            .send({
                environment: EnvType.DEFAULT,
                changes: [{
                    action: 'NEW',
                    diff: 'CONFIG',
                    path: [
                        'Group Test'
                    ],
                    content: {
                        key: 'NEW_SWITCHER_RELAY',
                        activated: true,
                        relay: {
                            type: RelayTypes.NOTIFICATION,
                            method: RelayMethods.POST,
                            description: 'New Relay',
                            activated: true,
                            endpoint: 'https://localhost:3000'
                        }
                    }
                }]
            })
            .expect(200);

        expect(req.body.message).toBe('Changes applied successfully');
        expect(req.body.version).toBeGreaterThan(lastUpdate);

        // Check if the changes were applied
        const config = await Config.findOne({ key: 'NEW_SWITCHER_RELAY', domain: domainId }).lean().exec();
        expect(config).not.toBeNull();
        expect(config.activated[EnvType.DEFAULT]).toBe(true);
        expect(config.relay).toMatchObject({
            type: RelayTypes.NOTIFICATION,
            method: RelayMethods.POST,
            description: 'New Relay',
            endpoint: {
                [EnvType.DEFAULT]: 'https://localhost:3000'
            },
            activated: {
                [EnvType.DEFAULT]: true
            },
            verified: {
                [EnvType.DEFAULT]: false
            }
        });
    });

    test('GITOPS_SUITE - Should push changes - New Switcher and Strategy', async () => {
        const token = generateToken('30s');

        const lastUpdate = Date.now();
        const req = await request(app)
            .post('/gitops/v1/push')
            .set('Authorization', `Bearer ${token}`)
            .send({
                environment: EnvType.DEFAULT,
                changes: [{
                    action: 'NEW',
                    diff: 'CONFIG',
                    path: [
                        'Group Test'
                    ],
                    content: {
                        key: 'NEW_SWITCHER_STRATEGY',
                        description: 'New Switcher',
                        activated: true,
                        strategies: [{
                            strategy: StrategiesType.VALUE,
                            description: 'Test Strategy',
                            operation: OperationsType.EXIST,
                            activated: true,
                            values: ['A', 'B']
                        }],
                        components: ['TestApp']
                    }
                }]
            })
            .expect(200);

        expect(req.body.message).toBe('Changes applied successfully');
        expect(req.body.version).toBeGreaterThan(lastUpdate);

        // Check if the changes were applied
        const config = await Config.findOne({ key: 'NEW_SWITCHER_STRATEGY', domain: domainId }).lean().exec();
        expect(config).not.toBeNull();
        expect(config.activated[EnvType.DEFAULT]).toBe(true);
        expect(config.components).toHaveLength(1);

        const strategy = await ConfigStrategy.findOne({ config: config._id }).lean().exec();
        expect(strategy).toMatchObject({
            description: 'Test Strategy',
            operation: OperationsType.EXIST,
            strategy: StrategiesType.VALUE,
            values: ['A', 'B'],
            activated: {
                [EnvType.DEFAULT]: true
            },
        });
    });

    test('GITOPS_SUITE - Should push changes - New Strategy', async () => {
        const token = generateToken('30s');

        const lastUpdate = Date.now();
        const req = await request(app)
            .post('/gitops/v1/push')
            .set('Authorization', `Bearer ${token}`)
            .send({
                environment: EnvType.DEFAULT,
                changes: [{
                    action: 'NEW',
                    diff: 'STRATEGY',
                    path: ['Group Test', 'TEST_CONFIG_KEY'],
                    content: {
                        strategy: StrategiesType.NUMERIC,
                        description: 'Test Strategy',
                        operation: OperationsType.EXIST,
                        activated: true,
                        values: ['100', '200']
                    }
                }]
            })
            .expect(200);

        expect(req.body.message).toBe('Changes applied successfully');
        expect(req.body.version).toBeGreaterThan(lastUpdate);

        // Check if the changes were applied
        const strategy = await ConfigStrategy.findOne({ config: configId, strategy: StrategiesType.NUMERIC }).lean().exec();
        expect(strategy).toMatchObject({
            description: 'Test Strategy',
            operation: OperationsType.EXIST,
            strategy: StrategiesType.NUMERIC,
            values: ['100', '200'],
            activated: {
                [EnvType.DEFAULT]: true
            },
        });
    });

    test('GITOPS_SUITE - Should push changes - New Strategy Value', async () => {
        const token = generateToken('30s');

        const lastUpdate = Date.now();
        const req = await request(app)
            .post('/gitops/v1/push')
            .set('Authorization', `Bearer ${token}`)
            .send({
                environment: EnvType.DEFAULT,
                changes: [{
                    action: 'CHANGED',
                    diff: 'STRATEGY',
                    path: ['Group Test', 'TEST_CONFIG_KEY', StrategiesType.VALUE],
                    content: {
                        values: ['USER_1', 'USER_2', 'USER_3', 'USER_4']
                    }
                }]
            })
            .expect(200);

        expect(req.body.message).toBe('Changes applied successfully');
        expect(req.body.version).toBeGreaterThan(lastUpdate);

        // Check if the changes were applied
        const strategy = await ConfigStrategy.findOne({ config: configId, strategy: StrategiesType.VALUE }).lean().exec();
        expect(strategy).toMatchObject({
            operation: OperationsType.EXIST,
            strategy: StrategiesType.VALUE,
            values: ['USER_1', 'USER_2', 'USER_3', 'USER_4']
        });
    });

    test('GITOPS_SUITE - Should push changes - New Component', async () => {
        const token = generateToken('30s');

        const lastUpdate = Date.now();
        const req = await request(app)
            .post('/gitops/v1/push')
            .set('Authorization', `Bearer ${token}`)
            .send({
                environment: EnvType.DEFAULT,
                changes: [{
                    action: 'NEW',
                    diff: 'COMPONENT',
                    path: ['Group Test', 'TEST_CONFIG_KEY_PRD_QA'],
                    content: ['TestApp']
                }]
            })
            .expect(200);

        expect(req.body.message).toBe('Changes applied successfully');
        expect(req.body.version).toBeGreaterThan(lastUpdate);

        // Check if the changes were applied
        const config = await Config.findOne({ key: 'TEST_CONFIG_KEY_PRD_QA', domain: domainId }).lean().exec();
        expect(config).not.toBeNull();
        expect(config.components).toHaveLength(1);
    });
});

describe('GitOps - Push Changed', () => {
    beforeAll(setupDatabase);

    test('GITOPS_SUITE - Should push changes - Changed Group', async () => {
        const token = generateToken('30s');

        const lastUpdate = Date.now();
        const req = await request(app)
            .post('/gitops/v1/push')
            .set('Authorization', `Bearer ${token}`)
            .send({
                environment: EnvType.DEFAULT,
                changes: [{
                    action: 'CHANGED',
                    diff: 'GROUP',
                    path: ['Group Test'],
                    content: {
                        activated: false,
                        description: 'Changed Group Description'
                    }
                }]
            })
            .expect(200);

        expect(req.body.message).toBe('Changes applied successfully');
        expect(req.body.version).toBeGreaterThan(lastUpdate);

        // Check if the changes were applied
        const group = await GroupConfig.findOne({ name: 'Group Test', domain: domainId }).lean().exec();
        expect(group).not.toBeNull();
        expect(group.activated[EnvType.DEFAULT]).toBe(false);
        expect(group.description).toBe('Changed Group Description');
    });

    test('GITOPS_SUITE - Should push changes - Changed Switcher', async () => {
        const token = generateToken('30s');

        const lastUpdate = Date.now();
        const req = await request(app)
            .post('/gitops/v1/push')
            .set('Authorization', `Bearer ${token}`)
            .send({
                environment: EnvType.DEFAULT,
                changes: [{
                    action: 'CHANGED',
                    diff: 'CONFIG',
                    path: ['Group Test', 'TEST_CONFIG_KEY'],
                    content: {
                        activated: false,
                        description: 'Changed Switcher Description'
                    }
                }]
            })
            .expect(200);

        expect(req.body.message).toBe('Changes applied successfully');
        expect(req.body.version).toBeGreaterThan(lastUpdate);

        // Check if the changes were applied
        const config = await Config.findOne({ key: 'TEST_CONFIG_KEY', domain: domainId }).lean().exec();
        expect(config).not.toBeNull();
        expect(config.activated[EnvType.DEFAULT]).toBe(false);
        expect(config.description).toBe('Changed Switcher Description');
    });

    test('GITOPS_SUITE - Should push changes - Changed Switcher Relay (added)', async () => {
        const token = generateToken('30s');

        const lastUpdate = Date.now();
        const req = await request(app)
            .post('/gitops/v1/push')
            .set('Authorization', `Bearer ${token}`)
            .send({
                environment: EnvType.DEFAULT,
                changes: [{
                    action: 'CHANGED',
                    diff: 'CONFIG',
                    path: ['Group Test', 'TEST_CONFIG_KEY_PRD_QA'],
                    content: {
                        relay: {
                            type: RelayTypes.NOTIFICATION,
                            method: RelayMethods.POST,
                            description: 'New Relay',
                            activated: true,
                            endpoint: 'https://localhost:3000'
                        }
                    }
                }]
            })
            .expect(200);

        expect(req.body.message).toBe('Changes applied successfully');
        expect(req.body.version).toBeGreaterThan(lastUpdate);

        // Check if the changes were applied
        const config = await Config.findOne({ key: 'TEST_CONFIG_KEY_PRD_QA', domain: domainId }).lean().exec();
        expect(config).not.toBeNull();
        expect(config.relay).toMatchObject({
            type: RelayTypes.NOTIFICATION,
            method: RelayMethods.POST,
            description: 'New Relay',
            activated: {
                [EnvType.DEFAULT]: true
            },
            endpoint: {
                [EnvType.DEFAULT]: 'https://localhost:3000'
            },
            verified: {
                [EnvType.DEFAULT]: false
            }
        });
    });

    test('GITOPS_SUITE - Should push changes - Changed Switcher Relay environment status/endpoint', async () => {
        const token = generateToken('30s');

        const lastUpdate = Date.now();
        const req = await request(app)
            .post('/gitops/v1/push')
            .set('Authorization', `Bearer ${token}`)
            .send({
                environment: 'QA',
                changes: [{
                    action: 'CHANGED',
                    diff: 'CONFIG',
                    path: ['Group Test', 'TEST_CONFIG_KEY'],
                    content: {
                        relay: {
                            endpoint: 'http://localhost:3001',
                            activated: false
                        }
                    }
                }]
            })
            .expect(200);

        expect(req.body.message).toBe('Changes applied successfully');
        expect(req.body.version).toBeGreaterThan(lastUpdate);

        // Check if the changes were applied
        const config = await Config.findOne({ key: 'TEST_CONFIG_KEY', domain: domainId }).lean().exec();
        expect(config).not.toBeNull();
        expect(config.relay).toMatchObject({
            type: RelayTypes.NOTIFICATION,
            method: RelayMethods.POST,
            description: 'Test Relay',
            activated: {
                ['QA']: false,
                [EnvType.DEFAULT]: true
            },
            endpoint: {
                ['QA']: 'http://localhost:3001',
                [EnvType.DEFAULT]: 'http://localhost:3000'
            }
        });
    });

    test('GITOPS_SUITE - Should push changes - Changed Strategy', async () => {
        const token = generateToken('30s');

        const lastUpdate = Date.now();
        const req = await request(app)
            .post('/gitops/v1/push')
            .set('Authorization', `Bearer ${token}`)
            .send({
                environment: EnvType.DEFAULT,
                changes: [{
                    action: 'CHANGED',
                    diff: 'STRATEGY',
                    path: ['Group Test', 'TEST_CONFIG_KEY', StrategiesType.VALUE],
                    content: {
                        activated: false,
                        description: 'Changed Strategy Description'
                    }
                }]
            })
            .expect(200);

        expect(req.body.message).toBe('Changes applied successfully');
        expect(req.body.version).toBeGreaterThan(lastUpdate);

        // Check if the changes were applied
        const strategy = await ConfigStrategy.findOne({ 
            config: configId, 
            strategy: StrategiesType.VALUE,
            activated: { [EnvType.DEFAULT]: false }
        }).lean().exec();

        expect(strategy).toMatchObject({
            description: 'Changed Strategy Description',
            values: ['USER_1', 'USER_2', 'USER_3'],
            activated: {
                [EnvType.DEFAULT]: false
            },
        });
    });

    test('GITOPS_SUITE - Should push changes - Changed Strategy environment status', async () => {
        const token = generateToken('30s');

        // given
        const changes = [{
            action: 'NEW',
            diff: 'STRATEGY',
            path: ['Group Test', 'TEST_CONFIG_KEY'],
            content: {
                strategy: StrategiesType.NUMERIC,
                description: 'Test Strategy',
                operation: OperationsType.EXIST,
                activated: true,
                values: ['100', '200']
            }
        }];
        
        // default environment
        await request(app)
            .post('/gitops/v1/push')
            .set('Authorization', `Bearer ${token}`)
            .send({
                environment: EnvType.DEFAULT,
                changes
            });

        // QA environment
        await request(app)
            .post('/gitops/v1/push')
            .set('Authorization', `Bearer ${token}`)
            .send({
                environment: 'QA',
                changes
            });

        // test
        const lastUpdate = Date.now();
        const req = await request(app)
            .post('/gitops/v1/push')
            .set('Authorization', `Bearer ${token}`)
            .send({
                environment: 'QA',
                changes: [{
                    action: 'CHANGED',
                    diff: 'STRATEGY',
                    path: ['Group Test', 'TEST_CONFIG_KEY', StrategiesType.NUMERIC],
                    content: {
                        activated: false
                    }
                }]
            })
            .expect(200);

        expect(req.body.message).toBe('Changes applied successfully');
        expect(req.body.version).toBeGreaterThan(lastUpdate);

        // Check if the changes were applied
        const strategies = await ConfigStrategy.find({ 
            config: configId, 
            strategy: StrategiesType.NUMERIC
        }).lean().exec();

        expect(strategies).toHaveLength(2);
        expect(strategies[0]).toMatchObject({
            activated: {
                [EnvType.DEFAULT]: true
            }
        });
        expect(strategies[1]).toMatchObject({
            activated: {
                ['QA']: false
            }
        });
    });
    
});

describe('GitOps - Push Deleted', () => {
    beforeAll(setupDatabase);

    test('GITOPS_SUITE - Should push changes - Deleted Component', async () => {
        const token = generateToken('30s');

        const lastUpdate = Date.now();
        const req = await request(app)
            .post('/gitops/v1/push')
            .set('Authorization', `Bearer ${token}`)
            .send({
                environment: EnvType.DEFAULT,
                changes: [{
                    action: 'DELETED',
                    diff: 'COMPONENT',
                    path: ['Group Test', 'TEST_CONFIG_KEY'],
                    content: ['TestApp']
                }]
            })
            .expect(200);

        expect(req.body.message).toBe('Changes applied successfully');
        expect(req.body.version).toBeGreaterThan(lastUpdate);

        // Check if the changes were applied
        const config = await Config.findOne({ key: 'TEST_CONFIG_KEY', domain: domainId }).lean().exec();
        expect(config).not.toBeNull();
        expect(config.components).toHaveLength(0);
    });

    test('GITOPS_SUITE - Should push changes - Deleted Strategy Value', async () => {
        const token = generateToken('30s');

        const lastUpdate = Date.now();
        const req = await request(app)
            .post('/gitops/v1/push')
            .set('Authorization', `Bearer ${token}`)
            .send({
                environment: EnvType.DEFAULT,
                changes: [{
                    action: 'CHANGED',
                    diff: 'STRATEGY',
                    path: ['Group Test', 'TEST_CONFIG_KEY', StrategiesType.VALUE],
                    content: {
                        values: ['USER_1', 'USER_3']
                    }
                }]
            })
            .expect(200);

        expect(req.body.message).toBe('Changes applied successfully');
        expect(req.body.version).toBeGreaterThan(lastUpdate);

        // Check if the changes were applied
        const strategy = await ConfigStrategy.findOne({ 
            config: configId, 
            strategy: StrategiesType.VALUE,
            activated: { [EnvType.DEFAULT]: true }
        }).lean().exec();

        expect(strategy).toMatchObject({
            values: ['USER_1', 'USER_3']
        });
    });

    test('GITOPS_SUITE - Should push changes - Deleted Strategy', async () => {
        const token = generateToken('30s');

        const lastUpdate = Date.now();
        const req = await request(app)
            .post('/gitops/v1/push')
            .set('Authorization', `Bearer ${token}`)
            .send({
                environment: EnvType.DEFAULT,
                changes: [{
                    action: 'DELETED',
                    diff: 'STRATEGY',
                    path: ['Group Test', 'TEST_CONFIG_KEY', StrategiesType.VALUE],
                    content: null
                }]
            })
            .expect(200);

        expect(req.body.message).toBe('Changes applied successfully');
        expect(req.body.version).toBeGreaterThan(lastUpdate);

        // Check if the changes were applied
        const strategy = await ConfigStrategy.findOne({ 
            config: configId, 
            strategy: StrategiesType.VALUE,
            activated: { [EnvType.DEFAULT]: true }
        }).lean().exec();

        expect(strategy).toBeNull();
    });

    test('GITOPS_SUITE - Should push changes - Deleted Switcher', async () => {
        const token = generateToken('30s');

        const lastUpdate = Date.now();
        const req = await request(app)
            .post('/gitops/v1/push')
            .set('Authorization', `Bearer ${token}`)
            .send({
                environment: EnvType.DEFAULT,
                changes: [{
                    action: 'DELETED',
                    diff: 'CONFIG',
                    path: ['Group Test', 'TEST_CONFIG_KEY'],
                    content: null
                }]
            })
            .expect(200);

        expect(req.body.message).toBe('Changes applied successfully');
        expect(req.body.version).toBeGreaterThan(lastUpdate);

        // Check if the changes were applied
        const config = await Config.findOne({ key: 'TEST_CONFIG_KEY', domain: domainId }).lean().exec();
        expect(config).toBeNull();
    });

    test('GITOPS_SUITE - Should push changes - Deleted Group', async () => {
        const token = generateToken('30s');

        const lastUpdate = Date.now();
        const req = await request(app)
            .post('/gitops/v1/push')
            .set('Authorization', `Bearer ${token}`)
            .send({
                environment: EnvType.DEFAULT,
                changes: [{
                    action: 'DELETED',
                    diff: 'GROUP',
                    path: ['Group Test'],
                    content: null
                }]
            })
            .expect(200);

        expect(req.body.message).toBe('Changes applied successfully');
        expect(req.body.version).toBeGreaterThan(lastUpdate);

        // Check if the changes were applied
        const group = await GroupConfig.findOne({ name: 'Group Test', domain: domainId }).lean().exec();
        expect(group).toBeNull();
    });

});

describe('GitOps - Push Changes - Errors (invalid requests)', () => {
    beforeAll(setupDatabase);

    test('GITOPS_SUITE - Should return error when action is invalid', async () => {
        const token = generateToken('30s');

        const req = await request(app)
            .post('/gitops/v1/push')
            .set('Authorization', `Bearer ${token}`)
            .send({
                environment: EnvType.DEFAULT,
                changes: [{
                    action: 'INVALID',
                    diff: 'STRATEGY',
                    path: []
                }]
            })
            .expect(422);

        expect(req.body.errors[0].msg).toBe('Request has invalid type of action');
    });

    test('GITOPS_SUITE - Should return error when change type is invalid', async () => {
        const token = generateToken('30s');

        const req = await request(app)
            .post('/gitops/v1/push')
            .set('Authorization', `Bearer ${token}`)
            .send({
                environment: EnvType.DEFAULT,
                changes: [{
                    action: 'NEW',
                    diff: 'INVALID',
                    path: []
                }]
            })
            .expect(422);

        expect(req.body.errors[0].msg).toBe('Request has invalid type of diff');
    });

    test('GITOPS_SUITE - Should return error when change content Array-based is not valid', async () => {
        const token = generateToken('30s');

        const req = await request(app)
            .post('/gitops/v1/push')
            .set('Authorization', `Bearer ${token}`)
            .send({
                environment: EnvType.DEFAULT,
                changes: [{
                    action: 'NEW',
                    diff: 'COMPONENT',
                    path: ['Group Test', 'TEST_CONFIG_KEY'],
                    content: {
                        value: 'SHOULD_BE_ARRAY'
                    }
                }]
            })
            .expect(422);

        expect(req.body.errors[0].msg).toBe('Request has invalid content type [object]');
    });

    test('GITOPS_SUITE - Should return error when change content Object-based is not valid', async () => {
        const token = generateToken('30s');

        const req = await request(app)
            .post('/gitops/v1/push')
            .set('Authorization', `Bearer ${token}`)
            .send({
                environment: EnvType.DEFAULT,
                changes: [{
                    action: 'NEW',
                    diff: 'STRATEGY',
                    path: ['Group Test', 'TEST_CONFIG_KEY'],
                    content: ['SHOULD_BE_OBJECT']
                }]
            })
            .expect(422);

        expect(req.body.errors[0].msg).toBe('Request has invalid content type [array]');
    });

    test('GITOPS_SUITE - Should return error when path is not properly defined - For New', async () => {
        const token = generateToken('30s');

        const req = await request(app)
            .post('/gitops/v1/push')
            .set('Authorization', `Bearer ${token}`)
            .send({
                environment: EnvType.DEFAULT,
                changes: [{
                    action: 'NEW',
                    diff: 'CONFIG',
                    path: [],
                    content: {
                        key: 'NEW_SWITCHER',
                        activated: true
                    }
                }]
            })
            .expect(422);

        expect(req.body.errors[0].msg).toBe('Request has invalid path settings for new element');
    });

    test('GITOPS_SUITE - Should return error when path is not properly defined - For Changed', async () => {
        const token = generateToken('30s');

        const req = await request(app)
            .post('/gitops/v1/push')
            .set('Authorization', `Bearer ${token}`)
            .send({
                environment: EnvType.DEFAULT,
                changes: [{
                    action: 'CHANGED',
                    diff: 'CONFIG',
                    path: [],
                    content: {
                        description: 'New Description',
                        activated: true
                    }
                }]
            })
            .expect(422);

        expect(req.body.errors[0].msg).toBe('Request has invalid path settings for changed element');
    });

    test('GITOPS_SUITE - Should return error when path is not properly defined - For Deleted', async () => {
        const token = generateToken('30s');

        const req = await request(app)
            .post('/gitops/v1/push')
            .set('Authorization', `Bearer ${token}`)
            .send({
                environment: EnvType.DEFAULT,
                changes: [{
                    action: 'DELETED',
                    diff: 'CONFIG',
                    path: []
                }]
            })
            .expect(422);

        expect(req.body.errors[0].msg).toBe('Request has invalid path settings for deleted element');
    });

    test('GITOPS_SUITE - Should return error when content is malformed', async () => {
        const token = generateToken('30s');

        const req = await request(app)
            .post('/gitops/v1/push')
            .set('Authorization', `Bearer ${token}`)
            .send({
                environment: EnvType.DEFAULT,
                changes: [{
                    action: 'NEW',
                    diff: 'CONFIG',
                    path: ['Group Test'],
                }]
            })
            .expect(500);

        expect(req.body.error).not.toBeNull();
        expect(req.body.error).toBe('One or more changes could not be applied');
    });

    test('GITOPS_SUITE - Should return error when request has invalid data', async () => {
        const token = generateToken('30s');

        const req = await request(app)
            .post('/gitops/v1/push')
            .set('Authorization', `Bearer ${token}`)
            .send({
                environment: EnvType.DEFAULT,
                changes: [{
                    action: 'CHANGED',
                    diff: 'GROUP',
                    path: ['Not Existing Group'],
                    content: {
                        description: 'New Description',
                        activated: true
                    }
                }]
            })
            .expect(500);

        expect(req.body.error).not.toBeNull();
        expect(req.body.error).toBe('One or more changes could not be applied');
    });

});