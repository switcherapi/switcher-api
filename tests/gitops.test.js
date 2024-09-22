import mongoose from 'mongoose';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import { Client } from 'switcher-client';
import { Config } from '../src/models/config';
import { ConfigStrategy, OperationsType, StrategiesType } from '../src/models/config-strategy';
import { EnvType } from '../src/models/environment';
import * as graphqlUtils from './graphql-utils';
import { 
    setupDatabase,
    domainId,
    configId
} from './fixtures/db_client';
import GroupConfig from '../src/models/group-config';

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

    test('GITOPS_SUITE - Should return error when action is invalid', async () => {
        const token = generateToken('30s');

        const requestPayload = {
            environment: EnvType.DEFAULT,
            changes: [{
                action: 'INVALID'
            }]
        };

        const req = await request(app)
            .post('/gitops/v1/push')
            .set('Authorization', `Bearer ${token}`)
            .send(requestPayload)
            .expect(400);

        expect(req.body.error).toBe('GitOps Integration is not available.');
    });
});

describe('GitOps - Push New Changes', () => {
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
                        configs: [{
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
});

describe('GitOps - Push Changes - Errors', () => {
    beforeAll(setupDatabase);

    test('GITOPS_SUITE - Should return error when action is invalid', async () => {
        const token = generateToken('30s');

        const req = await request(app)
            .post('/gitops/v1/push')
            .set('Authorization', `Bearer ${token}`)
            .send({
                environment: EnvType.DEFAULT,
                changes: [{
                    action: 'INVALID'
                }]
            })
            .expect(400);

        expect(req.body.message).toBe('Request has invalid type of change');
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
                    diff: 'INVALID'
                }]
            })
            .expect(400);

        expect(req.body.message).toBe('Request has invalid type of diff');
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
                }]
            })
            .expect(500);

        expect(req.body.error).not.toBeNull();
    });
});