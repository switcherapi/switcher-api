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
    domainId,
    groupConfigId,
    configId1,
    configId2,
    configStrategyId,
    configStrategyDocument
} = require('./fixtures/db')

beforeEach(setupDatabase)

afterAll(async () => { 
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mongoose.disconnect()
})

// test.only('Skip Config Strategy Test Suite')

test('STRATEGY_SUITE - Should create a new Config Strategy', async () => {
    const response = await request(app)
        .post('/configstrategy/create')
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
        .send({
            description: 'Description of my new Config Strategy',
            strategy: 'CIDR_VALIDATION',
            operation: 'EQUAL',
            values: [
                {
                    value: '192.168.0.1/16'
                }
            ],
            config: configId2
        }).expect(201)

    // DB validation - document created
    const configStrategy = await ConfigStrategy.findById(response.body._id)
    expect(configStrategy).not.toBeNull()

    // Response validation
    expect(response.body.description).toBe('Description of my new Config Strategy')
})

test('STRATEGY_SUITE - Should not create a new Config Strategy', async () => {
    const response = await request(app)
        .post('/configstrategy/create')
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
        .send({
            description: 'Description of my new Config Strategy',
            strategy: 'CIDR_VALIDATION',
            operation: 'EQUAL',
            values: [
                {
                    value: '192.168.0.1/16'
                }
            ],
            config: new mongoose.Types.ObjectId()
        }).expect(404)

    expect(response.body.message).toBe('Config not found')
})

test('STRATEGY_SUITE - Should not create a new Config Strategy - Wrong operation and strategies', async () => {
    await request(app)
        .post('/configstrategy/create')
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
        .send({
            description: 'Description of my new Config Strategy',
            strategy: 'WRONG_STRATEGY',
            operation: 'EQUAL',
            values: [
                {
                    value: '192.168.0.1/16'
                }
            ],
            config: configId2
        }).expect(400)

    await request(app)
        .post('/configstrategy/create')
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
        .send({
            description: 'Description of my new Config Strategy',
            strategy: 'CIDR_VALIDATION',
            operation: 'WORNG_OPERATION',
            values: [
                {
                    value: '192.168.0.1/16'
                }
            ],
            config: configId2
        }).expect(400)
})

test('STRATEGY_SUITE - Should get Config Strategy information', async () => {
    let response = await request(app)
        .get('/configstrategy?config=' + configId1)
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
        .send().expect(200)

    expect(response.body.length).toEqual(1)

    expect(String(response.body[0]._id)).toEqual(String(configStrategyDocument._id))
    expect(response.body[0].strategy).toEqual(configStrategyDocument.strategy)
    expect(response.body[0].operation).toEqual(configStrategyDocument.operation)
    expect(String(response.body[0].owner)).toEqual(String(configStrategyDocument.owner))
    expect(response.body[0].activated).toEqual(configStrategyDocument.activated)

    // Adding new Config Strategy
    response = await request(app)
        .post('/configstrategy/create')
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
        .send({
            description: 'Description of my new Config Strategy',
            strategy: 'CIDR_VALIDATION',
            operation: 'EQUAL',
            values: [
                {
                    value: '192.168.0.1/16'
                }
            ],
            config: configId1
        }).expect(201)

    // DB validation - document created
    const configStrategy = await ConfigStrategy.findById(response.body._id)
    expect(configStrategy).not.toBeNull()

    response = await request(app)
        .get('/configstrategy?config=' + configId1)
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
        .send().expect(200)

    expect(response.body.length).toEqual(2)
})

test('STRATEGY_SUITE - Should get Config Strategy information by Id', async () => {
    let response = await request(app)
        .get('/configstrategy/' + configStrategyId)
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
        .send().expect(200)

    expect(String(response.body._id)).toEqual(String(configStrategyDocument._id))
    expect(response.body.strategy).toEqual(configStrategyDocument.strategy)
    expect(response.body.operation).toEqual(configStrategyDocument.operation)
    expect(String(response.body.owner)).toEqual(String(configStrategyDocument.owner))
    expect(response.body.activated).toEqual(configStrategyDocument.activated)

    // Adding new Config Strategy
    response = await request(app)
        .post('/configstrategy/create')
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
        .send({
            description: 'Description of my new Config Strategy',
            strategy: 'CIDR_VALIDATION',
            operation: 'EQUAL',
            values: [
                {
                    value: '192.168.0.1/16'
                }
            ],
            config: configId1
        }).expect(201)

    response = await request(app)
        .get('/configstrategy/' + response.body._id)
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
        .send().expect(200)
})

test('STRATEGY_SUITE - Should not found Config Strategy information by Id', async () => {
    await request(app)
        .get('/configstrategy/' + 'NOTEXIST')
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
        .send().expect(404)
})

test('STRATEGY_SUITE - Should delete Config Strategy', async () => {
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
        .delete('/configstrategy/' + configStrategyId)
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
    expect(config1).not.toBeNull()

    config2 = await Config.findById(configId2)
    expect(config2).not.toBeNull()

    configStrategy = await ConfigStrategy.findById(configStrategyId)
    expect(configStrategy).toBeNull()
})

test('STRATEGY_SUITE - Should update Config Strategy info', async () => {

    let configStrategy = await ConfigStrategy.findById(configStrategyId)
    expect(configStrategy).not.toBeNull()
    expect(configStrategy.activated).toEqual(true)

    await request(app)
        .patch('/configstrategy/' + configStrategyId)
        .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
        .send({
            activated: false
        }).expect(200)
    
    // DB validation - verify flag updated
    configStrategy = await ConfigStrategy.findById(configStrategyId)
    expect(configStrategy).not.toBeNull()
    expect(configStrategy.activated).toEqual(false)
})

test('STRATEGY_SUITE - Should not update Config Strategy info', async () => {
    await request(app)
    .patch('/configstrategy/' + configStrategyId)
    .set('Authorization', `Bearer ${adminMasterAccount.tokens[0].token}`)
    .send({
        activated: false,
        config: 'I_SHOULD_NOT_UPDATE_THIS'
    }).expect(400)
})