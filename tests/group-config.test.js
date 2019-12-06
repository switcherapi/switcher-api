import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app';
import Admin from '../src/models/admin';
import Domain from '../src/models/domain';
import GroupConfig from '../src/models/group-config';
import Config from '../src/models/config';
import { EnvType } from '../src/models/environment';
import { ConfigStrategy } from '../src/models/config-strategy';
import { 
    setupDatabase,
    adminMasterAccountId,
    adminMasterAccount,
    adminAccount,
    domainId,
    groupConfigId,
    groupConfigDocument,
    configId1,
    configId2,
    configStrategyId
 } from './fixtures/db_api';

beforeEach(setupDatabase)

afterAll(async () => { 
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mongoose.disconnect()
})

test('GROUP_SUITE - Should create a new Group Config', async () => {
    const response = await request(app)
        .post('/groupconfig/create')
        .set('Authorization', `Bearer ${adminAccount.tokens[0].token}`)
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
        .set('Authorization', `Bearer ${adminAccount.tokens[0].token}`)
        .send({
            name: 'New Group Config',
            description: 'Description of my new Group Config',
            domain: new mongoose.Types.ObjectId()
        }).expect(404)
        
    expect(response.body.error).toBe('Domain not found')
})

test('GROUP_SUITE - Should get Group Config information', async () => {
    let response = await request(app)
        .get('/groupconfig?domain=' + domainId)
        .set('Authorization', `Bearer ${adminAccount.tokens[0].token}`)
        .send().expect(200)

    expect(response.body.length).toEqual(1)

    expect(String(response.body[0]._id)).toEqual(String(groupConfigDocument._id))
    expect(response.body[0].name).toEqual(groupConfigDocument.name)
    expect(String(response.body[0].owner)).toEqual(String(groupConfigDocument.owner))
    expect(response.body[0].activated[EnvType.DEFAULT]).toEqual(groupConfigDocument.activated.get(EnvType.DEFAULT))

    // Adding new Group Config
    response = await request(app)
        .post('/groupconfig/create')
        .set('Authorization', `Bearer ${adminAccount.tokens[0].token}`)
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
        .set('Authorization', `Bearer ${adminAccount.tokens[0].token}`)
        .send().expect(200)

    expect(response.body.length).toEqual(2)
})

test('GROUP_SUITE - Should get Group Config information by Id', async () => {
    let response = await request(app)
        .get('/groupconfig/' + groupConfigId)
        .set('Authorization', `Bearer ${adminAccount.tokens[0].token}`)
        .send().expect(200)

    expect(String(response.body._id)).toEqual(String(groupConfigDocument._id))
    expect(response.body.name).toEqual(groupConfigDocument.name)
    expect(String(response.body.owner)).toEqual(String(groupConfigDocument.owner))
    expect(response.body.activated[EnvType.DEFAULT]).toEqual(groupConfigDocument.activated.get(EnvType.DEFAULT))

    // Adding new Group Config
    response = await request(app)
        .post('/groupconfig/create')
        .set('Authorization', `Bearer ${adminAccount.tokens[0].token}`)
        .send({
            name: 'New Group Config 3',
            description: 'Description of my new Group Config 3',
            domain: domainId
        }).expect(201)

    response = await request(app)
        .get('/groupconfig/' + response.body._id)
        .set('Authorization', `Bearer ${adminAccount.tokens[0].token}`)
        .send().expect(200)
})

test('GROUP_SUITE - Should not found Group Config information by Id', async () => {
    await request(app)
        .get('/groupconfig/' + 'NOTEXIST')
        .set('Authorization', `Bearer ${adminAccount.tokens[0].token}`)
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
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
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

test('GROUP_SUITE - Should update Group Config info', async () => {

    let group = await GroupConfig.findById(groupConfigId)
    expect(group).not.toBeNull()

    await request(app)
        .patch('/groupconfig/' + groupConfigId)
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
        .send({
            name: 'Updated Group Name'
        }).expect(200)
    
    // DB validation - verify data updated
    group = await GroupConfig.findById(groupConfigId)
    expect(group).not.toBeNull()
    expect(group.name).toEqual('Updated Group Name')
})

test('GROUP_SUITE - Should not update Group Config info', async () => {
    await request(app)
    .patch('/groupconfig/' + groupConfigId)
    .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
    .send({
        name: 'Updated Group Name',
        owner: 'I_SHOULD_NOT_UPDATE_THIS'
    }).expect(400)
})

test('GROUP_SUITE - Should update Group environment status - default', async () => {
    expect(groupConfigDocument.activated.get(EnvType.DEFAULT)).toEqual(true);

    const response = await request(app)
        .patch('/groupconfig/updateStatus/' + groupConfigId)
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
        .send({
            default: false
        }).expect(200);

    expect(response.body.activated[EnvType.DEFAULT]).toEqual(false);

    // DB validation - verify status updated
    const group = await GroupConfig.findById(groupConfigId)
    expect(group.activated.get(EnvType.DEFAULT)).toEqual(false);
})

test('GROUP_SUITE - Should update Group environment status - QA', async () => {
    // QA Environment still does not exist
    expect(groupConfigDocument.activated.get('QA')).toEqual(undefined);

    // Creating QA Environment...
    await request(app)
        .post('/environment/create')
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
        .send({
            name: 'QA',
            domain: domainId
        }).expect(201)

    const response = await request(app)
        .patch('/groupconfig/updateStatus/' + groupConfigId)
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
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
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
        .send({
            QA: false
        }).expect(200);

    group = await GroupConfig.findById(groupConfigId)
    expect(group.activated.get(EnvType.DEFAULT)).toEqual(true);
    expect(group.activated.get('QA')).toEqual(false);
})

test('GROUP_SUITE - Should NOT update Group environment status - Permission denied', async () => {
    await request(app)
        .patch('/groupconfig/updateStatus/' + groupConfigId)
        .set('Authorization', `Bearer ${adminAccount.tokens[0].token}`)
        .send({
            default: false
        }).expect(400);
})

test('GROUP_SUITE - Should NOT update Group environment status - Group not fould', async () => {
    await request(app)
        .patch('/groupconfig/updateStatus/FAKE_GROUP')
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
        .send({
            default: false
        }).expect(400);
})

test('GROUP_SUITE - Should remove Group environment status', async () => {
    // Creating QA Environment...
    await request(app)
        .post('/environment/create')
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
        .send({
            name: 'QA',
            domain: domainId
        }).expect(201)
    
    await request(app)
        .patch('/groupconfig/updateStatus/' + groupConfigId)
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
        .send({
            QA: true
        }).expect(200);

    let group = await GroupConfig.findById(groupConfigId)
    expect(group.activated.get('QA')).toEqual(true);

    await request(app)
        .patch('/groupconfig/removeStatus/' + groupConfigId)
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
        .send({
            env: 'QA'
        }).expect(200);

    // DB validation - verify status updated
    group = await GroupConfig.findById(groupConfigId)
    expect(group.activated.get('QA')).toEqual(undefined);
})

test('GROUP_SUITE - Should NOT remove Group environment status', async () => {
    // Creating QA Environment...
    await request(app)
        .post('/environment/create')
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
        .send({
            name: 'QA',
            domain: domainId
        }).expect(201)

    await request(app)
        .patch('/groupconfig/updateStatus/' + groupConfigId)
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
        .send({
            QA: true
        }).expect(200);

    // default environment cannot be removed
    await request(app)
        .patch('/groupconfig/removeStatus/' + groupConfigId)
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
        .send({
            env: EnvType.DEFAULT
        }).expect(400);
    
    // QA environment cannot be removed without permission
    await request(app)
        .patch('/groupconfig/removeStatus/' + groupConfigId)
        .set('Authorization', `Bearer ${adminAccount.tokens[0].token}`)
        .send({
            env: 'QA'
        }).expect(400);

    // Group does not exist
    await request(app)
        .patch('/groupconfig/removeStatus/FAKE_GROUP')
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
        .send({
            env: 'QA'
        }).expect(400);

    const group = await GroupConfig.findById(groupConfigId)
    expect(group.activated.get(EnvType.DEFAULT)).toEqual(true);
    expect(group.activated.get('QA')).toEqual(true);
})