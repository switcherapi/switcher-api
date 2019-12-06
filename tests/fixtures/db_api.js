import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import Admin from '../../src/models/admin';
import Domain from '../../src/models/domain';
import GroupConfig from '../../src/models/group-config';
import Config from '../../src/models/config';
import { EnvType, Environment } from '../../src/models/environment';
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
    activated: new Map().set(EnvType.DEFAULT, true),
    owner: adminMasterAccountId,
    token: jwt.sign(({ _id: domainId, environment: EnvType.DEFAULT }) , process.env.JWT_CONFIG_SECRET)
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

const configId1 = new mongoose.Types.ObjectId()
const config1Document = {
    _id: configId1,
    key: 'TEST_CONFIG_KEY_1',
    description: 'Test config 1',
    activated: new Map().set(EnvType.DEFAULT, true),
    owner: adminMasterAccountId,
    group: groupConfigId,
    domain: domainId
}

const configId2 = new mongoose.Types.ObjectId()
const config2Document = {
    _id: configId2,
    key: 'TEST_CONFIG_KEY_2',
    description: 'Test config 2',
    activated: new Map().set(EnvType.DEFAULT, true),
    owner: adminMasterAccountId,
    group: groupConfigId,
    domain: domainId
}

const configStrategyId = new mongoose.Types.ObjectId()
const configStrategyDocument = {
    _id: configStrategyId,
    description: 'Test config strategy',
    activated: new Map().set(EnvType.DEFAULT, true),
    owner: adminMasterAccountId,
    config: configId1,
    operation: OperationsType.EXIST,
    strategy: StrategiesType.VALUE,
    values: ['USER_1', 'USER_2', 'USER_3'],
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
    await new Admin(adminAccount).save()

    await new Environment(environment1).save()
    await new Domain(domainDocument).save()
    await new GroupConfig(groupConfigDocument).save()
    await new Config(config1Document).save()
    await new Config(config2Document).save()
    await new ConfigStrategy(configStrategyDocument).save()
}

module.exports = {
    setupDatabase,
    adminMasterAccountId,
    adminMasterAccount,
    adminAccountId,
    adminAccount,
    environment1,
    domainDocument,
    domainId,
    groupConfigId,
    groupConfigDocument,
    configId1,
    config1Document,
    configId2,
    configStrategyId,
    configStrategyDocument
}