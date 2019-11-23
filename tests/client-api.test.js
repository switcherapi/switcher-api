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
    domainToken,
    groupConfigDocument,
    keyConfig,
    configId,
    configDocument,
    configStrategyUSERDocument,
    configStrategyCIDRDocument,
    configStrategyLOCATIONDocument,
    configStrategyTIME_BETWEENDocument,
    configStrategyTIME_GREATDocument,
    configStrategyUSERId,
    configStrategyCIDRId,
    configStrategyLOCATIONId,
    configStrategyTIME_BETWEENId,
    configStrategyTIME_GREATId
} = require('./fixtures/db_client')

const changeStrategy = async (strategyId, newOperation, status) => {
    const changeStrategy = await ConfigStrategy.findById(strategyId)
    strategy.operation = newOperation ? newOperation : strategy.operation
    strategy.activated = status ? status : strategy.activated
    await strategy.save()
}

const changeConfigStatus = async (configId, status) => {
    const config = await Config.findById(configId)
    config.activated = status
    await config.save()
}

const changeGroupConfigStatus = async (groupConfigId, status) => {
    const groupConfig = await GroupConfig.findById(groupConfigId)
    groupConfig.activated = status
    await groupConfig.save()
}

const changeDomainStatus = async (domainId, status) => {
    const domain = await Domain.findById(domainId)
    domain.activated = status
    await domain.save()
}

beforeEach(setupDatabase)

afterAll(async () => { 
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mongoose.disconnect()
})

test('CLIENT_SUITE - Should check - Simple active Config', async () => {
    // const response = await request(app)
    //     .get('/check/key=')
    //     .set('Authorization', `Bearer ${domainToken}`)
    //     .send().expect(201)

    // // DB validation - document created
    // const configStrategy = await ConfigStrategy.findById(response.body._id)
    // expect(configStrategy).not.toBeNull()

    // // Response validation
    // expect(response.body.description).toBe('Description of my new Config Strategy')
})