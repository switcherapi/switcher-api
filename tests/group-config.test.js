import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app';
import Admin from '../src/models/admin';
import Domain from '../src/models/domain';
import GroupConfig from '../src/models/group-config';
import Config from '../src/models/config';
import History from '../src/models/history';
import { EnvType } from '../src/models/environment';
import { ConfigStrategy } from '../src/models/config-strategy';
import { 
    setupDatabase,
    adminMasterAccountId,
    adminMasterAccountToken,
    adminAccountToken,
    domainId,
    groupConfigId,
    groupConfigDocument,
    configId1,
    configId2,
    configStrategyId
 } from './fixtures/db_api';

afterAll(async () => { 
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mongoose.disconnect()
})

describe('Testing Group insertion', () => {
    beforeAll(setupDatabase)

    test('GROUP_SUITE - Should create a new Group Config', async () => {
        const response = await request(app)
            .post('/groupconfig/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'New Group Config',
                description: 'Description of my new Group Config',
                domain: domainId
            }).expect(201)

        // DB validation - document created
        const group = await GroupConfig.findById(response.body._id)
        expect(group).not.toBeNull()

        // Response validation
        expect(response.body.name).toBe('New Group Config')
    })

    test('GROUP_SUITE - Should not create a new Group Config - with wrong domain Id', async () => {
        const response = await request(app)
            .post('/groupconfig/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'New Group Config',
                description: 'Description of my new Group Config',
                domain: new mongoose.Types.ObjectId()
            }).expect(404)
            
        expect(response.body.error).toBe('Domain not found')

        await request(app)
            .post('/groupconfig/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'New Group Config',
                description: 'Description of my new Group Config',
                domain: 'WRONG_ID_VALUE'
            }).expect(500)
    })
})

describe('Testing fetch Group info', () => {
    beforeAll(setupDatabase)

    test('GROUP_SUITE - Should get Group Config information', async () => {
        let response = await request(app)
            .get('/groupconfig?domain=' + domainId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)

        expect(response.body.length).toEqual(1)

        expect(String(response.body[0]._id)).toEqual(String(groupConfigDocument._id))
        expect(response.body[0].name).toEqual(groupConfigDocument.name)
        expect(String(response.body[0].owner)).toEqual(String(groupConfigDocument.owner))
        expect(response.body[0].activated[EnvType.DEFAULT]).toEqual(groupConfigDocument.activated.get(EnvType.DEFAULT))

        // Adding new Group Config
        response = await request(app)
            .post('/groupconfig/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'New Group Config 2',
                description: 'Description of my new Group Config 2',
                domain: domainId
            }).expect(201)

        // DB validation - document created
        const group = await GroupConfig.findById(response.body._id)
        expect(group).not.toBeNull()

        response = await request(app)
            .get('/groupconfig?domain=' + domainId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)

        expect(response.body.length).toEqual(2)

        // Query filter tests
        response = await request(app)
            .get('/groupconfig?domain=' + domainId + '&limit=1')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)

        expect(response.body.length).toEqual(1)

        response = await request(app)
            .get('/groupconfig?domain=' + domainId + '&sortBy=createdAt:desc')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)

        expect(response.body.length).toEqual(2)
    })

    test('GROUP_SUITE - Should get Group Config information by Id', async () => {
        let response = await request(app)
            .get('/groupconfig/' + groupConfigId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)

        expect(String(response.body._id)).toEqual(String(groupConfigDocument._id))
        expect(response.body.name).toEqual(groupConfigDocument.name)
        expect(String(response.body.owner)).toEqual(String(groupConfigDocument.owner))
        expect(response.body.activated[EnvType.DEFAULT]).toEqual(groupConfigDocument.activated.get(EnvType.DEFAULT))

        // Adding new Group Config
        response = await request(app)
            .post('/groupconfig/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'New Group Config 3',
                description: 'Description of my new Group Config 3',
                domain: domainId
            }).expect(201)

        response = await request(app)
            .get('/groupconfig/' + response.body._id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)
    })

    test('GROUP_SUITE - Should NOT get Group Config information by Id', async () => {
        await request(app)
            .get('/groupconfig/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(404)

        await request(app)
            .get('/groupconfig/INVALID_ID_VALUE')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(500)
    })

    test('GROUP_SUITE - Should NOT found Group Config information by Id', async () => {
        await request(app)
            .get('/groupconfig?domain=' + 'WRONG_ID_VALUE')
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .send().expect(500)

        await request(app)
            .get('/groupconfig?domain=' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .send().expect(404)
    })

    test('GROUP_SUITE - Should NOT delete Group Config by invalid Group Id', async () => {
        await request(app)
            .delete('/groupconfig/INVALID_ID_VALUE')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(500)

        await request(app)
            .delete('/groupconfig/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(404)
    })

    test('GROUP_SUITE - Should delete Group Config', async () => {
        // DB validation Before deleting
        let domain = await Domain.findById(domainId)
        expect(domain).not.toBeNull()

        let group = await GroupConfig.findById(groupConfigId)
        expect(group).not.toBeNull()

        let config1 = await Config.findById(configId1)
        expect(config1).not.toBeNull()

        let config2 = await Config.findById(configId2)
        expect(config2).not.toBeNull()

        let configStrategy = await ConfigStrategy.findById(configStrategyId)
        expect(configStrategy).not.toBeNull()

        await request(app)
            .delete('/groupconfig/' + groupConfigId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)

        const admin = await Admin.findById(adminMasterAccountId)
        expect(admin).not.toBeNull()

        // DB validation After - Verify deleted dependencies
        domain = await Domain.findById(domainId)
        expect(domain).not.toBeNull()

        group = await GroupConfig.findById(groupConfigId)
        expect(group).toBeNull()

        config1 = await Config.findById(configId1)
        expect(config1).toBeNull()

        config2 = await Config.findById(configId2)
        expect(config2).toBeNull()

        configStrategy = await ConfigStrategy.findById(configStrategyId)
        expect(configStrategy).toBeNull()
    })
})

describe('Testing update Group info', () => {
    beforeAll(setupDatabase)

    test('GROUP_SUITE - Should update Group Config info', async () => {

        let group = await GroupConfig.findById(groupConfigId)
        expect(group).not.toBeNull()

        await request(app)
            .patch('/groupconfig/' + groupConfigId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'Updated Group Name'
            }).expect(200)
        
        // DB validation - verify data updated
        group = await GroupConfig.findById(groupConfigId)
        expect(group).not.toBeNull()
        expect(group.name).toEqual('Updated Group Name')
    })

    test('GROUP_SUITE - Should NOT update Group Config info', async () => {
        await request(app)
        .patch('/groupconfig/' + groupConfigId)
        .set('Authorization', `Bearer ${adminMasterAccountToken}`)
        .send({
            name: 'Updated Group Name',
            owner: 'I_SHOULD_NOT_UPDATE_THIS'
        }).expect(400)
    })

    test('GROUP_SUITE - Should NOT update an unknown Group Config', async () => {
        await request(app)
            .patch('/groupconfig/UNKNOWN_GROUP_ID')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'Updated Group Name'
            }).expect(500)

        await request(app)
            .patch('/groupconfig/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'Updated Group Name'
            }).expect(404)
    })

    test('GROUP_SUITE - Should update Group environment status - default', async () => {
        expect(groupConfigDocument.activated.get(EnvType.DEFAULT)).toEqual(true);

        const response = await request(app)
            .patch('/groupconfig/updateStatus/' + groupConfigId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                default: false
            }).expect(200);

        expect(response.body.activated[EnvType.DEFAULT]).toEqual(false);

        // DB validation - verify status updated
        const group = await GroupConfig.findById(groupConfigId)
        expect(group.activated.get(EnvType.DEFAULT)).toEqual(false);
    })

    test('GROUP_SUITE - Should NOT list changes by invalid Group Id', async () => {
        await request(app)
            .get('/groupconfig/history/INVALID_ID_VALUE')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(500)

        await request(app)
            .get('/groupconfig/history/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(404)
    })

    test('GROUP_SUITE - Should record changes on history collection', async () => {
        let response = await request(app)
            .post('/groupconfig/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'Group Record Test',
                description: 'Description of my new Group Config',
                domain: domainId
            }).expect(201)
        
        const groupId = response.body._id
        response = await request(app)
                .get('/groupconfig/history/' + groupId)
                .set('Authorization', `Bearer ${adminMasterAccountToken}`)
                .send().expect(200)
        
        expect(response.body).toEqual([])

        await request(app)
            .patch('/groupconfig/' + groupId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                description: 'New description'
            }).expect(200)

        response = await request(app)
            .get('/groupconfig/history/' + groupId + '?sortBy=createdAt:desc')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)

        expect(response.body).not.toEqual([])

        // DB validation
        let history = await History.find({ elementId: groupId })
        expect(history[0].oldValue.get('description')).toEqual('Description of my new Group Config')
        expect(history[0].newValue.get('description')).toEqual('New description')

        await request(app)
            .patch('/groupconfig/updateStatus/' + groupId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                default: false
            }).expect(200);
        
        // DB validation
        history = await History.find({ elementId: groupId })
        expect(history.length).toEqual(2)
    })
})

describe('Testing envrionment status change #1', () => {
    beforeAll(setupDatabase)

    test('GROUP_SUITE - Should update Group environment status - QA', async () => {
        // QA Environment still does not exist
        expect(groupConfigDocument.activated.get('QA')).toEqual(undefined);

        // Creating QA Environment...
        await request(app)
            .post('/environment/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'QA',
                domain: domainId
            }).expect(201)

        const response = await request(app)
            .patch('/groupconfig/updateStatus/' + groupConfigId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                QA: true
            }).expect(200);

        expect(response.body.activated['QA']).toEqual(true);

        // DB validation - verify status updated
        let group = await GroupConfig.findById(groupConfigId)
        expect(group.activated.get(EnvType.DEFAULT)).toEqual(true);
        expect(group.activated.get('QA')).toEqual(true);

        // Inactivating QA. Default environment should stay activated
        await request(app)
            .patch('/groupconfig/updateStatus/' + groupConfigId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                QA: false
            }).expect(200);

        group = await GroupConfig.findById(groupConfigId)
        expect(group.activated.get(EnvType.DEFAULT)).toEqual(true);
        expect(group.activated.get('QA')).toEqual(false);
    })

    test('GROUP_SUITE - Should NOT update Group environment status - Invalid Group Id', async () => {
        await request(app)
            .patch('/groupconfig/updateStatus/INVALID_ID_VALUE')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                default: false
            }).expect(500);

        await request(app)
            .patch('/groupconfig/updateStatus/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                default: false
            }).expect(404);
    })
})

describe('Testing environment status change #2', () => {
    beforeAll(setupDatabase)

    test('GROUP_SUITE - Should remove Group environment status', async () => {
        // Creating QA Environment...
        await request(app)
            .post('/environment/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'QA',
                domain: domainId
            }).expect(201)
        
        await request(app)
            .patch('/groupconfig/updateStatus/' + groupConfigId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                QA: true
            }).expect(200);

        let group = await GroupConfig.findById(groupConfigId)
        expect(group.activated.get('QA')).toEqual(true);

        await request(app)
            .patch('/groupconfig/removeStatus/' + groupConfigId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                env: 'QA'
            }).expect(200);

        // DB validation - verify status updated
        group = await GroupConfig.findById(groupConfigId)
        expect(group.activated.get('QA')).toEqual(undefined);
    })

    test('GROUP_SUITE - Should NOT remove Group environment status', async () => {
        // Creating QA1 Environment...
        await request(app)
            .post('/environment/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'QA1',
                domain: domainId
            }).expect(201)

        await request(app)
            .patch('/groupconfig/updateStatus/' + groupConfigId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                QA1: true
            }).expect(200);

        // default environment cannot be removed
        await request(app)
            .patch('/groupconfig/removeStatus/' + groupConfigId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                env: EnvType.DEFAULT
            }).expect(400);

        // Group does not exist
        await request(app)
            .patch('/groupconfig/removeStatus/FAKE_GROUP')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                env: 'QA1'
            }).expect(400);

        const group = await GroupConfig.findById(groupConfigId)
        expect(group.activated.get(EnvType.DEFAULT)).toEqual(true);
        expect(group.activated.get('QA1')).toEqual(true);
    })

    test('GROUP_SUITE - Should remove records from history after deleting element', async () => {
        let history = await History.find({ elementId: groupConfigId })
        expect(history.length > 0).toEqual(true)
        await request(app)
            .delete('/groupconfig/' + groupConfigId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)

        history = await History.find({ elementId: groupConfigId })
        expect(history.length).toEqual(0)
    })
})