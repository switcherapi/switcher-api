import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app';
import { Team } from '../src/models/team';
import { Role, ActionTypes, RouterTypes } from '../src/models/role';
import { 
    setupDatabase,
    adminMasterAccountToken,
    team1Id,
    role1Id
 } from './fixtures/db_api';

afterAll(async () => { 
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mongoose.disconnect()
})

describe('Insertion tests', () => {
    beforeAll(setupDatabase)

    test('ROLE_SUITE - Should create a new Role', async () => {
        const response = await request(app)
            .post('/role/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                action: ActionTypes.SELECT,
                router: RouterTypes.GROUP
            }).expect(201)

        // DB validation - document created
        const role = await Role.findById(response.body._id)
        expect(role).not.toBeNull()

        // Response validation
        expect(response.body.action).toBe(ActionTypes.SELECT)
    })

    test('ROLE_SUITE - Should NOT create a new Role - Missing required parameter', async () => {
        await request(app)
            .post('/role/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                action: ActionTypes.SELECT
            }).expect(400)
    })
})

describe('Reading tests', () => {

    let roleId

    beforeAll(async () => {
        const response = await request(app)
            .post('/role/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                action: ActionTypes.DELETE,
                router: RouterTypes.GROUP
            }).expect(201)

            roleId = response.body._id
    })

    test('ROLE_SUITE - Should read all Roles from a Team', async () => {
        await request(app)
            .patch('/team/role/add/' + team1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                role: roleId
            }).expect(200)

        const response = await request(app)
            .get('/role?team=' + team1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)

        expect(response.body[0].action).toBe(ActionTypes.DELETE)
    })

    test('ROLE_SUITE - Should NOT read all Roles from a Domain - Invalid team Id', async () => {
        const response = await request(app)
            .get('/role?team=INVALID_ID')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(400)
    })

    test('ROLE_SUITE - Should read one single Role', async () => {
        const response = await request(app)
            .get('/role/' + roleId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)

        expect(response.body.action).toBe(ActionTypes.DELETE)
    })

    test('ROLE_SUITE - Should NOT read Role - Not found', async () => {
        await request(app)
            .get('/role/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(404)
    })

    test('ROLE_SUITE - Should NOT read Role - Invalid Id', async () => {
        await request(app)
            .get('/role/INVALID_ID')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(400)
    })

    test('ROLE_SUITE - Should NOT read Role - Team Id not provided', async () => {
        await request(app)
            .get('/role')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(500)
    })

    test('ROLE_SUITE - Should NOT read Roles - Team not found', async () => {
        await request(app)
            .get('/role?team=' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(404)
    })
})

describe('Updating tests', () => {
    beforeAll(setupDatabase)

    test('ROLE_SUITE - Should update a Role', async () => {
        await request(app)
            .patch('/role/' + role1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                active: false
            }).expect(200)

        // DB validation - document updated
        const role = await Role.findById(role1Id)
        expect(role.active).toBe(false)
    })

    test('ROLE_SUITE - Should NOT update a Role - Invalid field', async () => {
        await request(app)
            .patch('/role/' + team1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                value: 'New Value'
            }).expect(400)
    })

    test('ROLE_SUITE - Should NOT update a Role - Not found', async () => {
        await request(app)
            .patch('/role/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                active: true
            }).expect(404)
    })

    test('ROLE_SUITE - Should NOT update a Role - Invalid id', async () => {
        await request(app)
            .patch('/role/INVALID_ID')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                active: true
            }).expect(400)
    })
})

describe('Deletion tests', () => {
    beforeAll(setupDatabase)

    test('ROLE_SUITE - Should delete a Role', async () => {
        let response = await request(app)
            .post('/role/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                action: ActionTypes.SELECT,
                router: RouterTypes.GROUP
            }).expect(201)

        await request(app)
            .patch('/team/role/add/' + team1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                role: response.body._id
            }).expect(200)

        // DB validation
        let team = await Team.findById(team1Id)
        expect(team.roles.includes(response.body._id)).toEqual(true)

        response = await request(app)
            .delete('/role/' + response.body._id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)

        // DB validation - document deleted
        team = await Team.findById(team1Id)
        expect(team.roles.includes(response.body._id)).toEqual(false)

        let role = await Role.findById(response.body._id)
        expect(role).toBeNull()
    })

    test('ROLE_SUITE - Should NOT delete a Role - Not found', async () => {
        await request(app)
            .delete('/role/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(404)
    })

    test('ROLE_SUITE - Should NOT delete a Role - Invalid Id', async () => {
        await request(app)
            .delete('/role/INVALID_ID')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(400)
    })
})

describe('Updating role values tests', () => {
    beforeAll(setupDatabase)

    test('ROLE_SUITE - Should add a value to the role', async () => {
        await request(app)
            .patch('/role/value/add/' + role1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                value: 'NEW VALUE'
            }).expect(200)

        // DB validation
        const role = await Role.findById(role1Id)
        expect(role.values[0]).toEqual('NEW VALUE')
    })

    test('ROLE_SUITE - Should NOT add a value - Role not found', async () => {
        await request(app)
            .patch('/role/value/add/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                value: 'NEW VALUE'
            }).expect(404)
    })

    test('ROLE_SUITE - Should NOT add a value - Invalid Role Id', async () => {
        await request(app)
            .patch('/role/value/add/INVALID_ID')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                value: 'NEW VALUE'
            }).expect(400)
    })

    test('ROLE_SUITE - Should NOT add a value - Value not given', async () => {
        await request(app)
            .patch('/role/value/add/' + role1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(400)
    })

    test('ROLE_SUITE - Should NOT add a value - Value already joined', async () => {
        await request(app)
            .patch('/role/value/add/' + role1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                value: 'NEW VALUE'
            }).expect(400)
    })

    test('ROLE_SUITE - Should NOT add a value - Invalid parameter', async () => {
        await request(app)
            .patch('/role/value/add/' + role1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                values: ['NEW']
            }).expect(400)
    })
    
    test('ROLE_SUITE - Should NOT remove a value - Role not found', async () => {
        await request(app)
            .patch('/role/value/remove/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                value: 'NEW VALUE'
            }).expect(404)
    })

    test('ROLE_SUITE - Should NOT remove a value - Invalid Role Id', async () => {
        await request(app)
            .patch('/role/value/remove/INVALID_ID')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                value: 'NEW VALUE'
            }).expect(400)
    })

    test('ROLE_SUITE - Should NOT remove a value - Value not given', async () => {
        await request(app)
            .patch('/role/value/remove/' + role1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(400)
    })

    test('ROLE_SUITE - Should NOT remove a value - Invalid parameter', async () => {
        await request(app)
            .patch('/role/value/remove/' + role1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                values: '<- INVALID'
            }).expect(400)
    })

    test('ROLE_SUITE - Should NOT remove a value - Value does not exist', async () => {
        await request(app)
            .patch('/role/value/remove/' + role1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                value: 'I AM NOT EXIST'
            }).expect(404)
    })

    test('ROLE_SUITE - Should remove a value', async () => {
        await request(app)
            .patch('/role/value/remove/' + role1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                value: 'NEW VALUE'
            }).expect(200)

        // DB validation
        const role = await Role.findById(role1Id)
        expect(role.values.length).toBe(0)
    })
})