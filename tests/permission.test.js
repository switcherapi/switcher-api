import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app';
import { Team } from '../src/models/team';
import { Permission, ActionTypes, RouterTypes, KeyTypes } from '../src/models/permission';
import { 
    setupDatabase,
    adminMasterAccountToken,
    team1Id,
    permission1Id
 } from './fixtures/db_api';

afterAll(async () => { 
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mongoose.disconnect();
});

describe('Insertion tests', () => {
    beforeAll(setupDatabase);

    test('PERMISSION_SUITE - Should create a new Permission', async () => {
        const response = await request(app)
            .post('/permission/create/' + team1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                action: ActionTypes.READ,
                router: RouterTypes.GROUP
            }).expect(201);

        // DB validation - document created
        const permission = await Permission.findById(response.body._id).lean().exec();
        expect(permission).not.toBeNull();

        // Response validation
        expect(response.body.action).toBe(ActionTypes.READ);
    });

    test('PERMISSION_SUITE - Should NOT create a new Permission - Invalid parameter (route instead of router)', async () => {
        await request(app)
            .post('/permission/create/' + team1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                action: ActionTypes.READ,
                route: RouterTypes.GROUP
            }).expect(422);
    });

    test('PERMISSION_SUITE - Should NOT create a new Permission - Missing required parameter', async () => {
        await request(app)
            .post('/permission/create/' + team1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                action: ActionTypes.READ
            }).expect(422);
    });

    test('PERMISSION_SUITE - Should NOT create a new Permission - Team not found', async () => {
        await request(app)
            .post('/permission/create/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                action: ActionTypes.READ,
                router: RouterTypes.STRATEGY
            }).expect(404);
    });
});

describe('Insertion tests - by Environment', () => {
    beforeAll(setupDatabase);

    test('PERMISSION_SUITE - Should create a new Permission - Development only', async () => {
        const response = await request(app)
            .post('/permission/create/' + team1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                action: ActionTypes.READ,
                router: RouterTypes.GROUP,
                environments: ['development']
            }).expect(201);

        // DB validation - document created
        const permission = await Permission.findById(response.body._id).lean().exec();
        expect(permission).not.toBeNull();
        expect(permission.environments.includes('development')).toEqual(true);

        // Response validation
        expect(response.body.action).toBe(ActionTypes.READ);
        expect(response.body.environments.includes('development')).toEqual(true);
    });

    test('PERMISSION_SUITE - Should NOT create a new Permission - Environment is not an Array', async () => {
        await request(app)
            .post('/permission/create/' + team1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                action: ActionTypes.READ,
                router: RouterTypes.GROUP,
                environments: 'development'
            }).expect(422);
    });
});

describe('Reading tests', () => {

    let permissionId;

    beforeAll(async () => {
        const response = await request(app)
            .post('/permission/create/' + team1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                action: ActionTypes.DELETE,
                router: RouterTypes.GROUP
            }).expect(201);

            permissionId = response.body._id;
    });

    test('PERMISSION_SUITE - Should read all Permissions from a Team', async () => {
        const response = await request(app)
            .get('/permission?team=' + team1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        const foundPermission = response.body.filter(permission => permission.action === ActionTypes.DELETE);
        expect(foundPermission[0].action).toBe(ActionTypes.DELETE);
    });

    test('PERMISSION_SUITE - Should NOT read all Permissions from a Domain - Invalid team Id', async () => {
        await request(app)
            .get('/permission?team=INVALID_ID')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(422);
    });

    test('PERMISSION_SUITE - Should read one single Permission', async () => {
        const response = await request(app)
            .get(`/permission/${permissionId}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        expect(response.body.action).toBe(ActionTypes.DELETE);
    });

    test('PERMISSION_SUITE - Should NOT read Permission - Not found', async () => {
        await request(app)
            .get(`/permission/${new mongoose.Types.ObjectId()}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(404);
    });

    test('PERMISSION_SUITE - Should NOT read Permission - Invalid Id', async () => {
        await request(app)
            .get('/permission/INVALID_ID')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(422);
    });

    test('PERMISSION_SUITE - Should NOT read Permission - Team Id not provided', async () => {
        await request(app)
            .get('/permission')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(422);
    });

    test('PERMISSION_SUITE - Should NOT read Permissions - Team not found', async () => {
        await request(app)
            .get('/permission?team=' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(404);
    });

    test('PERMISSION_SUITE - Should get all available routers', async () => {
        const response = await request(app)
            .get('/permission/routers')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        expect(response.body.routersAvailable).toEqual(Object.values(RouterTypes));
    });

    test('PERMISSION_SUITE - Should get the router specification that contain its key', async () => {
        const response = await request(app)
            .get('/permission/spec/router/' + RouterTypes.DOMAIN)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        expect(response.body.key).toEqual(KeyTypes.NAME);
    });

    test('PERMISSION_SUITE - Should get an empty router specification', async () => {
        const response = await request(app)
            .get('/permission/spec/router/' + RouterTypes.ADMIN)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        expect(response.body.key).toBeUndefined();
    });

    test('PERMISSION_SUITE - Should get all available actions', async () => {
        const response = await request(app)
            .get('/permission/actions')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        expect(response.body.actionsAvailable).toEqual(Object.values(ActionTypes));
    });
    
});

describe('Updating tests', () => {
    beforeAll(setupDatabase);

    test('PERMISSION_SUITE - Should update a Permission', async () => {
        await request(app)
            .patch('/permission/' + permission1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                active: false
            }).expect(200);

        // DB validation - document updated
        const permission = await Permission.findById(permission1Id).lean().exec();
        expect(permission.active).toBe(false);
    });

    test('PERMISSION_SUITE - Should NOT update a Permission - Invalid field', async () => {
        await request(app)
            .patch('/permission/' + team1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                value: 'New Value'
            }).expect(400);
    });

    test('PERMISSION_SUITE - Should NOT update a Permission - Not found', async () => {
        await request(app)
            .patch('/permission/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                active: true
            }).expect(404);
    });

    test('PERMISSION_SUITE - Should NOT update a Permission - Invalid id', async () => {
        await request(app)
            .patch('/permission/INVALID_ID')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                active: true
            }).expect(422);
    });
});

describe('Deletion tests', () => {
    beforeAll(setupDatabase);

    test('PERMISSION_SUITE - Should delete a Permission', async () => {
        let response = await request(app)
            .post('/permission/create/' + team1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                action: ActionTypes.READ,
                router: RouterTypes.GROUP
            }).expect(201);

        // DB validation
        let team = await Team.findById(team1Id).exec();
        expect(team.permissions.includes(response.body._id)).toEqual(true);

        response = await request(app)
            .delete('/permission/' + response.body._id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        // DB validation - document deleted
        team = await Team.findById(team1Id).exec();
        expect(team.permissions.includes(response.body._id)).toEqual(false);

        let permission = await Permission.findById(response.body._id).lean().exec();
        expect(permission).toBeNull();
    });

    test('PERMISSION_SUITE - Should NOT delete a Permission - Not found', async () => {
        await request(app)
            .delete('/permission/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(404);
    });

    test('PERMISSION_SUITE - Should NOT delete a Permission - Invalid Id', async () => {
        await request(app)
            .delete('/permission/INVALID_ID')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(422);
    });
});

describe('Updating permission values tests', () => {
    beforeAll(setupDatabase);

    test('PERMISSION_SUITE - Should add a value to the permission', async () => {
        await request(app)
            .patch('/permission/value/add/' + permission1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                value: 'NEW VALUE'
            }).expect(200);

        // DB validation
        const permission = await Permission.findById(permission1Id).lean().exec();
        expect(permission.values[0]).toEqual('NEW VALUE');
    });

    test('PERMISSION_SUITE - Should update values from a permission', async () => {
        await request(app)
            .patch('/permission/updateValues/' + permission1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                values: ['NEW VALUE 1', 'OLD VALUE']
            }).expect(200);

        // DB validation
        let permission = await Permission.findById(permission1Id).exec();
        expect(permission.values.includes('NEW VALUE 1')).toEqual(true);
        expect(permission.values.includes('OLD VALUE')).toEqual(true);

        await request(app)
            .patch('/permission/updateValues/' + permission1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                values: ['NEW VALUE']
            }).expect(200);

        permission = await Permission.findById(permission1Id).exec();
        expect(permission.values.includes('NEW VALUE')).toEqual(true);
        expect(permission.values.includes('OLD VALUE')).toEqual(false);
    });

    test('PERMISSION_SUITE - Should NOT add a value - Permission not found', async () => {
        await request(app)
            .patch('/permission/value/add/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                value: 'NEW VALUE'
            }).expect(404);
    });

    test('PERMISSION_SUITE - Should NOT add a value - Invalid Permission Id', async () => {
        await request(app)
            .patch('/permission/value/add/INVALID_ID')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                value: 'NEW VALUE'
            }).expect(422);
    });

    test('PERMISSION_SUITE - Should NOT add a value - Value not given', async () => {
        await request(app)
            .patch('/permission/value/add/' + permission1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(422);
    });

    test('PERMISSION_SUITE - Should NOT add a value - Value already joined', async () => {
        await request(app)
            .patch('/permission/value/add/' + permission1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                value: 'NEW VALUE'
            }).expect(400);
    });

    test('PERMISSION_SUITE - Should NOT add a value - Invalid parameter', async () => {
        await request(app)
            .patch('/permission/value/add/' + permission1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                values: ['NEW']
            }).expect(400);
    });

    test('PERMISSION_SUITE - Should NOT update values from a permission - Invalid ID', async () => {
        await request(app)
            .patch('/permission/updateValues/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                values: ['NEW VALUE 1', 'OLD VALUE']
            }).expect(404);
    });

    test('PERMISSION_SUITE - Should NOT update values from a permission - Wrong ID', async () => {
        await request(app)
            .patch('/permission/updateValues/INVALID_ID')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                values: ['NEW VALUE 1', 'OLD VALUE']
            }).expect(422);
    });
    
    test('PERMISSION_SUITE - Should NOT remove a value - Permission not found', async () => {
        await request(app)
            .patch('/permission/value/remove/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                value: 'NEW VALUE'
            }).expect(404);
    });

    test('PERMISSION_SUITE - Should NOT remove a value - Invalid Permission Id', async () => {
        await request(app)
            .patch('/permission/value/remove/INVALID_ID')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                value: 'NEW VALUE'
            }).expect(422);
    });

    test('PERMISSION_SUITE - Should NOT remove a value - Value not given', async () => {
        await request(app)
            .patch('/permission/value/remove/' + permission1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(422);
    });

    test('PERMISSION_SUITE - Should NOT remove a value - Invalid parameter', async () => {
        await request(app)
            .patch('/permission/value/remove/' + permission1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                values: '<- INVALID'
            }).expect(400);
    });

    test('PERMISSION_SUITE - Should NOT remove a value - Value does not exist', async () => {
        await request(app)
            .patch('/permission/value/remove/' + permission1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                value: 'NOT_EXISTING_VALUE'
            }).expect(404);
    });

    test('PERMISSION_SUITE - Should remove a value', async () => {
        await request(app)
            .patch('/permission/value/remove/' + permission1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                value: 'NEW VALUE'
            }).expect(200);

        // DB validation
        const permission = await Permission.findById(permission1Id).lean().exec();
        expect(permission.values.length).toBe(0);
    });
});