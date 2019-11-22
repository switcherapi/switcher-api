const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const Admin = require('../../src/models/admin')
const Domain = require('../../src/models/domain')
const GroupConfig = require('../../src/models/group-config')
const Config = require('../../src/models/config')
const { ConfigStrategy } = require('../../src/models/config-strategy')

const adminMasterAccountId = new mongoose.Types.ObjectId()
const adminMasterAccount = {
    _id: adminMasterAccountId,
    name: 'Master Admin',
    email: 'master@mail.com',
    password: '123123123123',
    master: true,
    active: true,
    tokens: [{
        token: jwt.sign({
            _id: adminMasterAccountId
        }, process.env.JWT_SECRET)
    }]
}

const adminAccountId = new mongoose.Types.ObjectId()
const adminAccount = {
    _id: adminAccountId,
    name: 'Admin',
    email: 'admin@mail.com',
    password: 'asdasdasdasd',
    master: false,
    active: true,
    tokens: [{
        token: jwt.sign({
            _id: adminAccountId
        }, process.env.JWT_SECRET)
    }]
}

const domainId = new mongoose.Types.ObjectId()
const domainDocument = {
    _id: domainId,
    name: 'Domain',
    description: 'Test Domain',
    owner: adminMasterAccountId,
    token: jwt.sign({
            _id: domainId
        }, process.env.JWT_CONFIG_SECRET)
}

const groupConfigId = new mongoose.Types.ObjectId()
const groupConfigDocument = {
    _id: groupConfigId,
    name: 'Group Test',
    description: 'Test Group',
    owner: adminMasterAccountId,
    domain: domainId,
    activated: true
}

const configId1 = new mongoose.Types.ObjectId()
const config1Document = {
    _id: configId1,
    key: 'TEST_CONFIG_KEY_1',
    description: 'Test config 1',
    owner: adminMasterAccountId,
    group: groupConfigId,
    activated: true
}

const configId2 = new mongoose.Types.ObjectId()
const config2Document = {
    _id: configId2,
    key: 'TEST_CONFIG_KEY_2',
    description: 'Test config 2',
    owner: adminMasterAccountId,
    group: groupConfigId,
    activated: true
}

const configStrategyId = new mongoose.Types.ObjectId()
const configStrategyVal1Id = new mongoose.Types.ObjectId()
const configStrategyVal2Id = new mongoose.Types.ObjectId()
const configStrategyVal3Id = new mongoose.Types.ObjectId()
const configStrategyDocument = {
    _id: configStrategyId,
    description: 'Test config strategy',
    owner: adminMasterAccountId,
    config: configId1,
    activated: true,
    operation: 'EXIST',
    strategy: 'USER_VALIDATION',
    values: [
        {
            _id: configStrategyVal1Id,
            value: 'USER_1'
        },
        {
            _id: configStrategyVal2Id,
            value: 'USER_2'
        },
        {
            _id: configStrategyVal3Id,
            value: 'USER_3'
        }
    ]
}

const setupDatabase = async () => {
    await ConfigStrategy.deleteMany()
    await Config.deleteMany()
    await GroupConfig.deleteMany()
    await Domain.deleteMany()
    await Admin.deleteMany()

    await new Admin(adminMasterAccount).save()
    await new Admin(adminAccount).save()

    await new Domain(domainDocument).save()
    await new GroupConfig(groupConfigDocument).save()
    await new Config(config1Document).save()
    await new Config(config2Document).save()
    await new ConfigStrategy(configStrategyDocument).save()
}

const setupFullProfile = async () => {

}

module.exports = {
    setupDatabase,
    setupFullProfile,
    adminMasterAccountId,
    adminMasterAccount,
    adminAccountId,
    adminAccount
}