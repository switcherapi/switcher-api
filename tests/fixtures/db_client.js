import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import Admin from '../../src/models/admin';
import Domain from '../../src/models/domain';
import GroupConfig from '../../src/models/group-config';
import Config from '../../src/models/config';
import { Environment, EnvType } from '../../src/models/environment';
import { ConfigStrategy, StrategiesType, OperationsType } from '../../src/models/config-strategy';

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
const domainToken = jwt.sign(({ _id: domainId, environment: EnvType.DEFAULT }) , process.env.JWT_CONFIG_SECRET)
const domainDocument = {
    _id: domainId,
    name: 'Domain',
    description: 'Test Domain',
    activated: new Map().set(EnvType.DEFAULT, true),
    owner: adminMasterAccountId,
    token: domainToken
}

const environment1Id = new mongoose.Types.ObjectId()
const environment1 = {
    _id: environment1Id,
    name: EnvType.DEFAULT,
    domain: domainId,
    owner: adminMasterAccountId
}

const groupConfigId = new mongoose.Types.ObjectId()
const groupConfigDocument = {
    _id: groupConfigId,
    name: 'Group Test',
    description: 'Test Group',
    activated: new Map().set(EnvType.DEFAULT, true),
    owner: adminMasterAccountId,
    domain: domainId
}

const keyConfig = 'TEST_CONFIG_KEY'
const configId = new mongoose.Types.ObjectId()
const configDocument = {
    _id: configId,
    key: keyConfig,
    description: 'Test config 1',
    activated: new Map().set(EnvType.DEFAULT, true),
    owner: adminMasterAccountId,
    group: groupConfigId,
    domain: domainId
}

const configStrategyUSERId = new mongoose.Types.ObjectId()
const configStrategyUSERDocument = {
    _id: configStrategyUSERId,
    description: 'Test config strategy User Validation',
    activated: new Map().set(EnvType.DEFAULT, true),
    owner: adminMasterAccountId,
    config: configId,
    operation: OperationsType.EXIST,
    strategy: StrategiesType.VALUE,
    values: ['USER_1', 'USER_2', 'USER_3'],
    domain: domainId
}

const configStrategyCIDRId = new mongoose.Types.ObjectId()
const configStrategyCIDRDocument = {
    _id: configStrategyCIDRId,
    description: 'Test config strategy Network Validation',
    activated: new Map().set(EnvType.DEFAULT, true),
    owner: adminMasterAccountId,
    config: configId,
    operation: OperationsType.EXIST,
    strategy: StrategiesType.NETWORK,
    values: ['10.0.0.0/24'],
    domain: domainId
}

const configStrategyTIME_GREATId = new mongoose.Types.ObjectId()
const configStrategyTIME_GREATDocument = {
    _id: configStrategyTIME_GREATId,
    description: 'Test config strategy Date Validation',
    activated: new Map().set(EnvType.DEFAULT, false),
    owner: adminMasterAccountId,
    config: configId,
    operation: OperationsType.GREATER,
    strategy: StrategiesType.DATE,
    values: ['2019-12-01T13:00Z'],
    domain: domainId
}

const configStrategyTIME_BETWEENId = new mongoose.Types.ObjectId()
const configStrategyTIME_BETWEENDocument = {
    _id: configStrategyTIME_BETWEENId,
    description: 'Test config strategy TIME_VALIDATION',
    activated: new Map().set(EnvType.DEFAULT, false),
    owner: adminMasterAccountId,
    config: configId,
    operation: OperationsType.BETWEEN,
    strategy: StrategiesType.TIME,
    values: ['13:00Z', '14:00Z'],
    domain: domainId
}

const configStrategyLOCATIONId = new mongoose.Types.ObjectId()
const configStrategyLOCATIONDocument = {
    _id: configStrategyLOCATIONId,
    description: 'Test config strategy LOCATION_VALIDATION',
    activated: new Map().set(EnvType.DEFAULT, false),
    owner: adminMasterAccountId,
    config: configId,
    operation: OperationsType.EXIST,
    strategy: StrategiesType.LOCATION,
    values: ['Vancouver', 'Dallas'],
    domain: domainId
}

const setupDatabase = async () => {
    await ConfigStrategy.deleteMany()
    await Config.deleteMany()
    await GroupConfig.deleteMany()
    await Domain.deleteMany()
    await Admin.deleteMany()
    await Environment.deleteMany()

    await new Admin(adminMasterAccount).save()
    await new Environment(environment1).save()
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