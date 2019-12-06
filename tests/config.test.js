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
    configId1,
    config1Document,
    configId2,
    configStrategyId
 } from './fixtures/db_api';

beforeEach(setupDatabase)

afterAll(async () => { 
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mongoose.disconnect()
})

test('CONFIG_SUITE - Should create a new Config', async () => {
    const response = await request(app)
        .post('/config/create')
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
        .send({
            key: 'NEW_CONFIG',
            description: 'Description of my new Config',
            group: groupConfigId
        }).expect(201)

    // DB validation - document created
    const config = await Config.findById(response.body._id)
    expect(config).not.toBeNull()

    // Response validation
    expect(response.body.key).toBe('NEW_CONFIG')
})

test('CONFIG_SUITE - Should not create a new Config - with wrong group config Id', async () => {
    const response = await request(app)
        .post('/config/create')
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
        .send({
            key: 'NEW_CONFIG',
            description: 'Description of my new Config',
            domain: new mongoose.Types.ObjectId()
        }).expect(404)

    expect(response.body.error).toBe('Group Config not found')
})

test('CONFIG_SUITE - Should get Config information', async () => {
    let response = await request(app)
        .get('/config?group=' + groupConfigId)
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
        .send().expect(200)

    expect(response.body.length).toEqual(2)

    expect(String(response.body[0]._id)).toEqual(String(config1Document._id))
    expect(response.body[0].key).toEqual(config1Document.key)
    expect(String(response.body[0].owner)).toEqual(String(config1Document.owner))
    expect(response.body[0].activated[EnvType.DEFAULT]).toEqual(config1Document.activated.get(EnvType.DEFAULT))

    // Adding new Config
    response = await request(app)
        .post('/config/create')
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
        .send({
            key: 'NEW_CONFIG',
            description: 'Description of my new Config',
            group: groupConfigId
        }).expect(201)

    // DB validation - document created
    const config = await Config.findById(response.body._id)
    expect(config).not.toBeNull()

    response = await request(app)
        .get('/config?group=' + groupConfigId)
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
        .send().expect(200)

    expect(response.body.length).toEqual(3)
})

test('CONFIG_SUITE - Should get Config information by Id', async () => {
    let response = await request(app)
        .get('/config/' + configId1)
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
        .send().expect(200)

    expect(String(response.body._id)).toEqual(String(config1Document._id))
    expect(response.body.key).toEqual(config1Document.key)
    expect(String(response.body.group)).toEqual(String(config1Document.group))
    expect(response.body.activated[EnvType.DEFAULT]).toEqual(config1Document.activated.get(EnvType.DEFAULT))

    // Adding new Config
    response = await request(app)
        .post('/config/create')
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
        .send({
            key: 'NEW_CONFIG',
            description: 'Description of my new Config',
            group: groupConfigId
        }).expect(201)

    response = await request(app)
        .get('/config/' + response.body._id)
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
        .send().expect(200)
})

test('CONFIG_SUITE - Should not found Config information by Id', async () => {
    await request(app)
        .get('/config/' + 'NOTEXIST')
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
        .send().expect(404)
})

test('CONFIG_SUITE - Should delete Config', async () => {
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
        .delete('/config/' + configId1)
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
        .send().expect(200)

    const admin = await Admin.findById(adminMasterAccountId)
    expect(admin).not.toBeNull()

    // DB validation After - Verify deleted dependencies
    domain = await Domain.findById(domainId)
    expect(domain).not.toBeNull()

    group = await GroupConfig.findById(groupConfigId)
    expect(group).not.toBeNull()

    config1 = await Config.findById(configId1)
    expect(config1).toBeNull()

    config2 = await Config.findById(configId2)
    expect(config2).not.toBeNull()

    configStrategy = await ConfigStrategy.findById(configStrategyId)
    expect(configStrategy).toBeNull()
})

test('CONFIG_SUITE - Should update Config info', async () => {

    let config = await Config.findById(configId1)
    expect(config).not.toBeNull()

    await request(app)
        .patch('/config/' + configId1)
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
        .send({
            key: 'NEWKEY',
            description: 'New description'
        }).expect(200)
    
    // DB validation - verify flag updated
    config = await Config.findById(configId1)
    expect(config).not.toBeNull()
    expect(config.key).toEqual('NEWKEY')
    expect(config.description).toEqual('New description')
})

test('CONFIG_SUITE - Should not update Config info', async () => {
    await request(app)
    .patch('/config/' + configId1)
    .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
    .send({
        activated: false,
        owner: 'I_SHOULD_NOT_UPDATE_THIS'
    }).expect(400)
})

test('CONFIG_SUITE - Should update Config environment status - default', async () => {
    expect(config1Document.activated.get(EnvType.DEFAULT)).toEqual(true);

    const response = await request(app)
        .patch('/config/updateStatus/' + configId1)
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
        .send({
            default: false
        }).expect(200);

    expect(response.body.activated[EnvType.DEFAULT]).toEqual(false);

    // DB validation - verify status updated
    const config = await Config.findById(configId1)
    expect(config.activated.get(EnvType.DEFAULT)).toEqual(false);
})

test('CONFIG_SUITE - Should update Config environment status - QA', async () => {
    // QA Environment still does not exist
    expect(config1Document.activated.get('QA')).toEqual(undefined);

    // Creating QA Environment...
    await request(app)
        .post('/environment/create')
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
        .send({
            name: 'QA',
            domain: domainId
        }).expect(201)

    const response = await request(app)
        .patch('/config/updateStatus/' + configId1)
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
        .send({
            QA: true
        }).expect(200);

    expect(response.body.activated['QA']).toEqual(true);

    // DB validation - verify status updated
    let config = await Config.findById(configId1)
    expect(config.activated.get(EnvType.DEFAULT)).toEqual(true);
    expect(config.activated.get('QA')).toEqual(true);

    // Inactivating QA. Default environment should stay activated
    await request(app)
        .patch('/config/updateStatus/' + configId1)
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
        .send({
            QA: false
        }).expect(200);

    config = await Config.findById(configId1)
    expect(config.activated.get(EnvType.DEFAULT)).toEqual(true);
    expect(config.activated.get('QA')).toEqual(false);
})

test('CONFIG_SUITE - Should NOT update Config environment status - Permission denied', async () => {
    await request(app)
        .patch('/config/updateStatus/' + configId1)
        .set('Authorization', `Bearer ${adminAccount.tokens[0].token}`)
        .send({
            default: false
        }).expect(400);
})

test('CONFIG_SUITE - Should NOT update Config environment status - Config not fould', async () => {
    await request(app)
        .patch('/config/updateStatus/FAKE_CONFIG')
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
        .send({
            default: false
        }).expect(400);
})

test('CONFIG_SUITE - Should remove Config environment status', async () => {
    // Creating QA Environment...
    await request(app)
        .post('/environment/create')
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
        .send({
            name: 'QA',
            domain: domainId
        }).expect(201)
    
    await request(app)
        .patch('/config/updateStatus/' + configId1)
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
        .send({
            QA: true
        }).expect(200);

    let config = await Config.findById(configId1)
    expect(config.activated.get('QA')).toEqual(true);

    await request(app)
        .patch('/config/removeStatus/' + configId1)
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
        .send({
            env: 'QA'
        }).expect(200);

    // DB validation - verify status updated
    config = await Config.findById(configId1)
    expect(config.activated.get('QA')).toEqual(undefined);
})

test('CONFIG_SUITE - Should NOT remove Config environment status', async () => {
    // Creating QA Environment...
    await request(app)
        .post('/environment/create')
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
        .send({
            name: 'QA',
            domain: domainId
        }).expect(201)

    await request(app)
        .patch('/config/updateStatus/' + configId1)
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
        .send({
            QA: true
        }).expect(200);

    // default environment cannot be removed
    await request(app)
        .patch('/config/removeStatus/' + configId1)
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
        .send({
            env: EnvType.DEFAULT
        }).expect(400);
    
    // QA environment cannot be removed without permission
    await request(app)
        .patch('/config/removeStatus/' + configId1)
        .set('Authorization', `Bearer ${adminAccount.tokens[0].token}`)
        .send({
            env: 'QA'
        }).expect(400);

    // Config does not exist
    await request(app)
        .patch('/config/removeStatus/FAKE_CONFIG')
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
        .send({
            env: 'QA'
        }).expect(400);

    const config = await Config.findById(configId1)
    expect(config.activated.get(EnvType.DEFAULT)).toEqual(true);
    expect(config.activated.get('QA')).toEqual(true);
})