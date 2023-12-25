import mongoose from 'mongoose';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import * as graphqlUtils from './graphql-utils';
import { 
    setupDatabase,
    domainId
} from './fixtures/db_client';

afterAll(async () => { 
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mongoose.disconnect();
});

const generateToken = (expiresIn) => {
    return jwt.sign(({ 
        iss: 'GitOps Service',
        sub: '/resource',
        subject: domainId.toString(),
    }), process.env.SWITCHER_GITOPS_JWT_SECRET, {
        expiresIn
    });
};

describe('GitOps', () => {
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