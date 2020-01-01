import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app';
import Component from '../src/models/component';
import { 
    setupDatabase,
    adminMasterAccountToken,
    adminAccountToken,
    domainId
 } from './fixtures/db_api';

afterAll(async () => { 
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mongoose.disconnect()
})

describe('Insertion tests', () => {
    beforeAll(setupDatabase)

    test('COMPONENT_SUITE - Should create a new Component', async () => {
        const response = await request(app)
            .post('/component/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'my-web-app',
                description: 'This is my Web App using this wonderful API',
                domain: domainId
            }).expect(201)

        // DB validation - document created
        const component = await Component.findById(response.body._id)
        expect(component).not.toBeNull()

        // Response validation
        expect(response.body.name).toBe('my-web-app')
    })

    test('COMPONENT_SUITE - Should NOT create a new Component - Permission denied', async () => {
        await request(app)
            .post('/component/create')
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .send({
                name: 'my-web-app',
                description: 'This is my Web App using this wonderful API',
                domain: domainId
            }).expect(401)
    })

    test('COMPONENT_SUITE - Should NOT create a new Component - Component already exist', async () => {
        const response = await request(app)
            .post('/component/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'my-web-app',
                description: 'This is my Web App using this wonderful API',
                domain: domainId
            }).expect(400)

        expect(response.body.error).toBe(`Unable to complete the operation. Component 'my-web-app' already exist for this Domain`)
    })

    test('COMPONENT_SUITE - Should NOT create a new Component - Domain not found', async () => {
        await request(app)
            .post('/component/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'my-web-app',
                description: 'This is my Web App using this wonderful API',
                domain: 'FAKE_DOMAIN'
            }).expect(400)
    })
})

describe('Reading tests', () => {

    let component1Id

    beforeAll(async () => {
        const response = await request(app)
            .post('/component/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'COMPONENT_1',
                description: 'Component 1 for reading test',
                domain: domainId
            }).expect(201)

        component1Id = response.body._id
    })

    test('COMPONENT_SUITE - Should read all Components from a Domain', async () => {
        const response = await request(app)
            .get('/component?domain=' + domainId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)

        expect(response.body[0].name).toBe('COMPONENT_1')
    })

    test('COMPONENT_SUITE - Should read one single Component', async () => {
        const response = await request(app)
            .get('/component/' + component1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)

        expect(response.body.name).toBe('COMPONENT_1')
    })

    test('COMPONENT_SUITE - Should NOT read Component - Not found', async () => {
        const response = await request(app)
            .get('/component/NOT_FOUND')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(404)
    })
})

describe('Updating tests', () => {
    beforeAll(setupDatabase)

    test('COMPONENT_SUITE - Should update a Component', async () => {
        let response = await request(app)
            .post('/component/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'my-web-app-to-be-updated',
                description: 'This is my Web App using this wonderful API',
                domain: domainId
            }).expect(201)
        
        // DB validation - document created
        let component = await Component.findById(response.body._id)
        expect(component.description).toBe('This is my Web App using this wonderful API')

        response = await request(app)
            .patch('/component/' + response.body._id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                description: 'Wow, this is my updated description'
            }).expect(200)

        // DB validation - document updated
        component = await Component.findById(response.body._id)
        expect(component.description).toBe('Wow, this is my updated description')
    })

    test('COMPONENT_SUITE - Should NOT update a Component - Invalid field', async () => {
        let response = await request(app)
            .post('/component/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'my-web-app-to-not-be-updated',
                description: 'This is my Web App using this wonderful API',
                domain: domainId
            }).expect(201)

        // DB validation - document created
        let component = await Component.findById(response.body._id)
        expect(component.name).toBe('my-web-app-to-not-be-updated')

        response = await request(app)
            .patch('/component/' + response.body._id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'CANNOT_UPDATE'
            }).expect(400)

    })
})

describe('Deletion tests', () => {
    beforeAll(setupDatabase)

    test('COMPONENT_SUITE - Should delete a Component', async () => {
        let response = await request(app)
            .post('/component/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'my-web-app-to-be-deleted',
                description: 'This is my Web App using this wonderful API',
                domain: domainId
            }).expect(201)

        response = await request(app)
            .delete('/component/' + response.body._id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)

        // DB validation - document deleted
        const component = await Component.findById(response.body._id)
        expect(component).toBeNull()
    })

    test('COMPONENT_SUITE - Should NOT delete a Component - Permission denied', async () => {
        let response = await request(app)
            .post('/component/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'my-web-app-to-not-be-deleted',
                description: 'This is my Web App using this wonderful API',
                domain: domainId
            }).expect(201)

        await request(app)
            .delete('/component/' + response.body._id)
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .send().expect(401)
    })
})