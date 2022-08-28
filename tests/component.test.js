import mongoose from 'mongoose';
import request from 'supertest';
import bcryptjs from 'bcryptjs';
import app from '../src/app';
import Component from '../src/models/component';
import { 
    setupDatabase,
    adminMasterAccountToken,
    domainId,
    configId1,
    adminMasterAccountId
 } from './fixtures/db_api';
import { 
    createDummyComponent, 
    createDummyDomain } from './fixtures/db_factory';
import { Config } from '../src/models/config';

afterAll(async () => { 
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mongoose.disconnect();
});

describe('Insertion tests', () => {
    let component1Id;
    let dummyDomain;

    beforeAll(async () => {
        await setupDatabase();
        dummyDomain = await createDummyDomain('Dummy Domain', adminMasterAccountId);
    });

    test('COMPONENT_SUITE - Should create a new Component', async () => {
        //given
        await createDummyComponent('my-web-app', dummyDomain._id, adminMasterAccountId);

        //test
        const response = await request(app)
            .post('/component/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'my-web-app',
                description: 'This is my Web App using this wonderful API',
                domain: domainId
            }).expect(201);

        // DB validation - document created
        const component = await Component.findById(response.body.component._id).lean();
        expect(component).not.toBeNull();

        // Response validation
        expect(response.body.component.name).toBe('my-web-app');
        component1Id = response.body.component._id;
    });

    test('COMPONENT_SUITE - Should NOT create a new Component - Component already exist', async () => {
        const response = await request(app)
            .post('/component/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'my-web-app',
                description: 'This is my Web App using this wonderful API',
                domain: domainId
            }).expect(400);

        expect(response.body.error).toBe('Unable to complete the operation. Component \'my-web-app\' already exist for this Domain');
    });

    test('COMPONENT_SUITE - Should NOT create a new Component - Domain not found', async () => {
        await request(app)
            .post('/component/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'my-web-app',
                description: 'This is my Web App using this wonderful API',
                domain: 'FAKE_DOMAIN'
            }).expect(400);
    });

    test('COMPONENT_SUITE - Should NOT create a new Component - Name too short', async () => {
        await request(app)
            .post('/component/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'C',
                description: 'This is my Web App using this wonderful API',
                domain: domainId
            }).expect(422);
    });

    test('COMPONENT_SUITE - Should generate a valid API Key for a Component', async () => {
        const response = await request(app)
            .get('/component/generateApiKey/' + component1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(201);

        expect(response.body.apiKey).not.toBeNull();
        // DB validation - current Domain token should not be as the same as the generated
        const apiKey = Buffer.from(response.body.apiKey, 'base64').toString('ascii');
        const component = await Component.findById(component1Id).lean();
        const isMatch = await bcryptjs.compare(apiKey, component.apihash);
        expect(isMatch).toEqual(true);
    });

    test('COMPONENT_SUITE - Should NOT generate an API Key for', async () => {
        // Invalid component ID
        await request(app)
            .get('/component/generateApiKey/INVALID_COMPONENT_ID')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(422);

        // Not found component ID
        await request(app)
            .get('/component/generateApiKey/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(404);
    });
});

describe('Reading tests', () => {

    let component1Id;

    beforeAll(async () => {
        const response = await request(app)
            .post('/component/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'COMPONENT_1',
                description: 'Component 1 for reading test',
                domain: domainId
            }).expect(201);

        component1Id = response.body.component._id;
    });

    test('COMPONENT_SUITE - Should read all Components from a Domain', async () => {
        const response = await request(app)
            .get('/component?domain=' + domainId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        expect(response.body[0].name).toBe('COMPONENT_1');
    });

    test('COMPONENT_SUITE - Should read one single Component', async () => {
        const response = await request(app)
            .get('/component/' + component1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        expect(response.body.name).toBe('COMPONENT_1');
    });

    test('COMPONENT_SUITE - Should NOT read Component - Invalid Id', async () => {
        await request(app)
            .get('/component/NOT_FOUND')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(422);
    });

    test('COMPONENT_SUITE - Should NOT read Component - Not found', async () => {
        await request(app)
            .get('/component/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(404);
    });

    test('COMPONENT_SUITE - Should NOT read Component - Invalid Domain Id', async () => {
        await request(app)
            .get('/component?domain=INVALID_ID')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(422);
    });

    test('COMPONENT_SUITE - Should NOT read Component - Domain Id not specified', async () => {
        await request(app)
            .get('/component?domain=')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(422);
    });
});

describe('Updating tests', () => {
    beforeAll(setupDatabase);

    test('COMPONENT_SUITE - Should update a Component', async () => {
        let response = await request(app)
            .post('/component/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'my-web-app-to-be-updated',
                description: 'This is my Web App using this wonderful API',
                domain: domainId
            }).expect(201);
        
        // DB validation - document created
        let component = await Component.findById(response.body.component._id).lean();
        expect(component.description).toBe('This is my Web App using this wonderful API');

        response = await request(app)
            .patch('/component/' + response.body.component._id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                description: 'Wow, this is my updated description'
            }).expect(200);

        // DB validation - document updated
        component = await Component.findById(response.body._id).lean();
        expect(component.description).toBe('Wow, this is my updated description');
    });

    test('COMPONENT_SUITE - Should NOT update a Component - Invalid Component Id/Not found', async () => {
        await request(app)
            .post('/component/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'CannotUpdateThis',
                description: 'This is my Web App using this wonderful API',
                domain: domainId
            }).expect(201);

        await request(app)
            .patch('/component/INVALID_ID')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                description: 'Wow, this should be my updated description, only not'
            }).expect(422);

        await request(app)
            .patch('/component/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                description: 'Wow, this should be my updated description, only not'
            }).expect(404);

    });
});

describe('Deletion tests', () => {
    beforeAll(setupDatabase);

    test('COMPONENT_SUITE - Should delete a Component', async () => {
        let response = await request(app)
            .post('/component/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'my-web-app-to-be-deleted',
                description: 'This is my Web App using this wonderful API',
                domain: domainId
            }).expect(201);

        //Adding component to a Config. It should be removed after deleting
        await request(app)
            .patch('/config/addComponent/' + configId1)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                component: response.body.component._id
            }).expect(200);

        const configsToRemoveFrom = await Config.find({ components: { $in: [response.body.component._id] } }).lean();
        expect(configsToRemoveFrom[0]._id).toEqual(configId1);

        response = await request(app)
            .delete('/component/' + response.body.component._id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        // DB validation - document deleted
        const component = await Component.findById(response.body._id).lean();
        expect(component).toBeNull();
    });

    test('COMPONENT_SUITE - Should NOT delete a Component - Invalid Component Id/Not found', async () => {
        await request(app)
            .post('/component/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'CannotDeleteThis',
                description: 'This is my Web App using this wonderful API',
                domain: domainId
            }).expect(201);

        await request(app)
            .delete('/component/INVALID_ID')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(422);

        await request(app)
            .delete('/component/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(404);
    });

});