const mongoose = require('mongoose')
const request = require('supertest')
const app = require('../src/app')
const Admin = require('../src/models/admin')
const Domain = require('../src/models/domain')
const GroupConfig = require('../src/models/group-config')
const Config = require('../src/models/config')
const { ConfigStrategy } = require('../src/models/config-strategy')
const {
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
} = require('./fixtures/db_api')

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
    expect(response.body[0].activated).toEqual(groupConfigDocument.activated)

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
    expect(response.body.activated).toEqual(groupConfigDocument.activated)

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
    expect(group.activated).toEqual(true)

    await request(app)
        .patch('/groupconfig/' + groupConfigId)
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
        .send({
            name: 'Updated Group Name',
            activated: false
        }).expect(200)
    
    // DB validation - verify data updated
    group = await GroupConfig.findById(groupConfigId)
    expect(group).not.toBeNull()
    expect(group.name).toEqual('Updated Group Name')
    expect(group.activated).toEqual(false)
})

test('GROUP_SUITE - Should not update Group Config info', async () => {
    await request(app)
    .patch('/groupconfig/' + groupConfigId)
    .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
    .send({
        name: 'Updated Group Name',
        activated: false,
        owner: 'I_SHOULD_NOT_UPDATE_THIS'
    }).expect(400)
})