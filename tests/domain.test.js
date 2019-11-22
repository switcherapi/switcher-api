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
    domainDocument,
    domainId,
    groupConfigId,
    configId1,
    configId2,
    configStrategyId
} = require('./fixtures/db')

beforeEach(setupDatabase)

afterAll(async () => { 
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mongoose.disconnect()
})

// test.only('Skip Domain Test Suite')

test('Should create a new Domain', async () => {
    const responseLogin = await request(app)
        .post('/admin/login')
        .send({
            email: adminMasterAccount.email,
            password: adminMasterAccount.password
        }).expect(200)

    const response = await request(app)
        .post('/domain/create')
        .set('Authorization', `Bearer ${responseLogin.body.token}`)
        .send({
            name: "New Domain",
            description: "Description of my new Domain"
        }).expect(201)

    // DB validation - document created
    const domain = await Domain.findById(response.body._id)
    expect(domain).not.toBeNull()

    // Response validation
    expect(response.body.name).toBe('New Domain')
})

test('Should not create a new Domain - with no Master credential', async () => {
    const responseLogin = await request(app)
        .post('/admin/login')
        .send({
            email: adminAccount.email,
            password: adminAccount.password
        }).expect(200)

    const response = await request(app)
        .post('/domain/create')
        .set('Authorization', `Bearer ${responseLogin.body.token}`)
        .send({
            name: "New Domain",
            description: "Description of my new Domain"
        }).expect(400)

    expect(response.body.message).toEqual('Unable to create Domains without a Master Admin credential')
})

test('Should generate Token for a Domain', async () => {
    const responseLogin = await request(app)
        .post('/admin/login')
        .send({
            email: adminMasterAccount.email,
            password: adminMasterAccount.password
        }).expect(200)

    await new Promise(resolve => setTimeout(resolve, 1000));
    const response = await request(app)
        .get('/domain/generateKey/' + domainId)
        .set('Authorization', `Bearer ${responseLogin.body.token}`)
        .send().expect(201)

    expect(response.body.token).not.toBeNull()

    // DB validation - current Domain token should not be as the same as the generated
    const domain = await Domain.findById(domainId)
    expect(domain.token).not.toEqual(response.body.token)
})

test('Should not generate Token for a Domain', async () => {
    const responseLogin = await request(app)
        .post('/admin/login')
        .send({
            email: adminAccount.email,
            password: adminAccount.password
        }).expect(200)

    await request(app)
        .get('/domain/generateKey/' + domainId)
        .set('Authorization', `Bearer ${responseLogin.body.token}`)
        .send().expect(400)
})

test('Should get Domain information', async () => {
    let response = await request(app)
        .get('/domain')
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
        .send().expect(200)

    expect(response.body.length).toEqual(1)

    expect(String(response.body[0]._id)).toEqual(String(domainDocument._id))
    expect(response.body[0].name).toEqual(domainDocument.name)
    expect(String(response.body[0].owner)).toEqual(String(domainDocument.owner))
    expect(response.body[0].token).toEqual(domainDocument.token)

    // Adding new Domain
    response = await request(app)
        .post('/domain/create')
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
        .send({
            name: "New Domain 2",
            description: "Description of my new Domain 2"
        }).expect(201)

    // DB validation - document created
    const domain = await Domain.findById(response.body._id)
    expect(domain).not.toBeNull()

    response = await request(app)
        .get('/domain')
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
        .send().expect(200)

    expect(response.body.length).toEqual(2)
})

test('Should get Domain information by Id', async () => {
    let response = await request(app)
        .get('/domain/' + domainId)
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
        .send().expect(200)

    expect(String(response.body._id)).toEqual(String(domainDocument._id))
    expect(response.body.name).toEqual(domainDocument.name)
    expect(String(response.body.owner)).toEqual(String(domainDocument.owner))
    expect(response.body.token).toEqual(domainDocument.token)

    // Adding new Domain
    response = await request(app)
        .post('/domain/create')
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
        .send({
            name: "New Domain 2",
            description: "Description of my new Domain 2"
        }).expect(201)

    response = await request(app)
        .get('/domain/' + response.body._id)
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
        .send().expect(200)
})

test('Should not found Domain information by Id', async () => {
    let response = await request(app)
        .get('/domain/' + domainId + 'NOTEXIST')
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
        .send().expect(404)
})

test('Should delete Domain', async () => {
    const responseLogin = await request(app)
        .post('/admin/login')
        .send({
            email: adminMasterAccount.email,
            password: adminMasterAccount.password
        }).expect(200)

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
        .delete('/domain/' + domainId)
        .set('Authorization', `Bearer ${responseLogin.body.token}`)
        .send().expect(200)

    const admin = await Admin.findById(adminMasterAccountId)
    expect(admin).not.toBeNull()

    // DB validation After - Verify deleted dependencies
    domain = await Domain.findById(domainId)
    expect(domain).toBeNull()

    group = await GroupConfig.findById(groupConfigId)
    expect(group).toBeNull()

    config1 = await Config.findById(configId1)
    expect(config1).toBeNull()

    config2 = await Config.findById(configId2)
    expect(config2).toBeNull()

    configStrategy = await ConfigStrategy.findById(configStrategyId)
    expect(configStrategy).toBeNull()
})

test('Should not delete Domain', async () => {
    const responseLogin = await request(app)
        .post('/admin/login')
        .send({
            email: adminAccount.email,
            password: adminAccount.password
        }).expect(200)

    await request(app)
        .delete('/domain/' + domainId)
        .set('Authorization', `Bearer ${responseLogin.body.token}`)
        .send().expect(400)
})

test('Should update Domain info', async () => {
    const responseLogin = await request(app)
        .post('/admin/login')
        .send({
            email: adminMasterAccount.email,
            password: adminMasterAccount.password
        }).expect(200)

    const oldToken = await Domain.findById(domainId).select('token')

    await new Promise(resolve => setTimeout(resolve, 1000));
    const responseNewToken = await request(app)
        .get('/domain/generateKey/' + domainId)
        .set('Authorization', `Bearer ${responseLogin.body.token}`)
        .send().expect(201)

    expect(responseNewToken.body.token).not.toBeNull()

    await request(app)
        .patch('/domain/' + domainId)
        .set('Authorization', `Bearer ${responseLogin.body.token}`)
        .send({
            token: responseNewToken.body.token
        }).expect(200)
    
    // DB validation - verify token updated
    const newToken = await Domain.findById(domainId).select('token')
    expect(oldToken).not.toEqual(newToken.token)
    expect(responseNewToken.body.token).toEqual(newToken.token)
})

test('Should not update Domain info without Master credential', async () => {
    const responseLogin = await request(app)
        .post('/admin/login')
        .send({
            email: adminAccount.email,
            password: adminAccount.password
        }).expect(200)

    await new Promise(resolve => setTimeout(resolve, 1000));
    const responseNewToken = await request(app)
        .get('/domain/generateKey/' + domainId)
        .set('Authorization', `Bearer ${responseLogin.body.token}`)
        .send().expect(400)
})