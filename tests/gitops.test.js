import mongoose from 'mongoose';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import { Client } from 'switcher-client';
import { Config } from '../src/models/config';
import { ConfigStrategy } from '../src/models/config-strategy';
import { EnvType } from '../src/models/environment';
import * as graphqlUtils from './graphql-utils';
import { 
    setupDatabase,
    domainId
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

describe('GitOps - Push Changes', () => {
    beforeAll(setupDatabase);

    test('GITOPS_SUITE - Should push changes to the domain - New Switcher', async () => {
        const token = generateToken('30s');

        const requestPayload = {
            environment: EnvType.DEFAULT,
            changes: [{
                action: 'NEW',
                diff: 'CONFIG',
                path: [
                    'Group Test'
                ],
                content: {
                    key: 'NEW_SWITCHER',
                    description: 'New Switcher',
                    activated: true,
                    strategies: [{
                        strategy: 'VALUE_VALIDATION',
                        description: 'Test Strategy',
                        operation: 'EXIST',
                        activated: true,
                        values: ['A', 'B']
                    }],
                    components: ['TestApp']
                }
            }]
        };

        const lastUpdate = Date.now();
        const req = await request(app)
            .post('/gitops/v1/push')
            .set('Authorization', `Bearer ${token}`)
            .send(requestPayload)
            .expect(200);

        expect(req.body.message).toBe('Changes applied successfully');
        expect(req.body.version).toBeGreaterThan(lastUpdate);

        // Check if the changes were applied
        const config = await Config.findOne({ key: 'NEW_SWITCHER', domain: domainId }).lean().exec();
        expect(config).not.toBeNull();
        expect(config.activated[EnvType.DEFAULT]).toBe(true);
        expect(config.components).toHaveLength(1);

        const strategy = await ConfigStrategy.findOne({ config: config._id }).lean().exec();
        expect(strategy).not.toBeNull();
        expect(strategy.activated[EnvType.DEFAULT]).toBe(true);
        expect(strategy.values).toEqual(['A', 'B']);
        expect(strategy.operation).toBe('EXIST');
        expect(strategy.description).toBe('Test Strategy');
        expect(strategy.strategy).toBe('VALUE_VALIDATION');
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

        expect(req.body.message).toBe('Request has invalid actions');
    });

    test('GITOPS_SUITE - Should return error when content is malformed', async () => {
        const token = generateToken('30s');

        const requestPayload = {
            environment: EnvType.DEFAULT,
            changes: [{
                action: 'NEW',
                diff: 'CONFIG',
            }]
        };

        const req = await request(app)
            .post('/gitops/v1/push')
            .set('Authorization', `Bearer ${token}`)
            .send(requestPayload)
            .expect(500);

        expect(req.body.error).not.toBeNull();
    });

});