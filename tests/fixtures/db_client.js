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

const domainId = new mongoose.Types.ObjectId()
const domainToken = jwt.sign({ _id: domainId }, process.env.JWT_CONFIG_SECRET)
const domainDocument = {
    _id: domainId,
    name: 'Domain',
    description: 'Test Domain',
    owner: adminMasterAccountId,
    token: domainToken
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

const keyConfig = 'TEST_CONFIG_KEY'
const configId = new mongoose.Types.ObjectId()
const configDocument = {
    _id: configId,
    key: keyConfig,
    description: 'Test config 1',
    owner: adminMasterAccountId,
    group: groupConfigId,
    activated: true
}

const configStrategyUSERId = new mongoose.Types.ObjectId()
const configStrategyUSERDocument = {
    _id: configStrategyUSERId,
    description: 'Test config strategy USER_VALIDATION',
    owner: adminMasterAccountId,
    config: configId,
    activated: false,
    operation: 'EXIST',
    strategy: 'USER_VALIDATION',
    values: [
        {
            _id: new mongoose.Types.ObjectId(),
            value: 'USER_1'
        },
        {
            _id: new mongoose.Types.ObjectId(),
            value: 'USER_2'
        },
        {
            _id: new mongoose.Types.ObjectId(),
            value: 'USER_3'
        }
    ]
}

const configStrategyCIDRId = new mongoose.Types.ObjectId()
const configStrategyCIDRDocument = {
    _id: configStrategyCIDRId,
    description: 'Test config strategy CIDR_VALIDATION',
    owner: adminMasterAccountId,
    config: configId,
    activated: false,
    operation: 'EXIST',
    strategy: 'CIDR_VALIDATION',
    values: [
        {
            _id: new mongoose.Types.ObjectId(),
            value: '10.0.0.0/24'
        }
    ]
}

const configStrategyTIME_GREATId = new mongoose.Types.ObjectId()
const configStrategyTIME_GREATDocument = {
    _id: configStrategyTIME_GREATId,
    description: 'Test config strategy TIME_VALIDATION',
    owner: adminMasterAccountId,
    config: configId,
    activated: false,
    operation: 'GREATER',
    strategy: 'TIME_VALIDATION',
    values: [
        {
            _id: new mongoose.Types.ObjectId(),
            value: '2019-12-01 13:00Z'
        }
    ]
}

const configStrategyTIME_BETWEENId = new mongoose.Types.ObjectId()
const configStrategyTIME_BETWEENDocument = {
    _id: configStrategyTIME_BETWEENId,
    description: 'Test config strategy TIME_VALIDATION',
    owner: adminMasterAccountId,
    config: configId,
    activated: false,
    operation: 'BETWEEN',
    strategy: 'TIME_VALIDATION',
    values: [
        {
            _id: new mongoose.Types.ObjectId(),
            value: '2019-12-01 13:00Z'
        },
        {
            _id: new mongoose.Types.ObjectId(),
            value: '2019-12-03 13:00Z'
        }
    ]
}

const configStrategyLOCATIONId = new mongoose.Types.ObjectId()
const configStrategyLOCATIONDocument = {
    _id: configStrategyLOCATIONId,
    description: 'Test config strategy LOCATION_VALIDATION',
    owner: adminMasterAccountId,
    config: configId,
    activated: false,
    operation: 'EXIST',
    strategy: 'LOCATION_VALIDATION',
    values: [
        {
            _id: new mongoose.Types.ObjectId(),
            value: 'Vancouver'
        },
        {
            _id: new mongoose.Types.ObjectId(),
            value: 'Dallas'
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
    await new Domain(domainDocument).save()
    await new GroupConfig(groupConfigDocument).save()
    await new Config(configDocument).save()
    await new ConfigStrategy(configStrategyUSERDocument).save()
    await new ConfigStrategy(configStrategyCIDRDocument).save()
    await new ConfigStrategy(configStrategyLOCATIONDocument).save()
    await new ConfigStrategy(configStrategyTIME_BETWEENDocument).save()
    await new ConfigStrategy(configStrategyTIME_GREATDocument).save()
}

module.exports = {
    setupDatabase,
    adminMasterAccountId,
    adminMasterAccount,
    domainDocument,
    domainId,
    domainToken,
    groupConfigId,
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
}