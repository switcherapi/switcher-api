import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import Admin from '../../src/models/admin';
import Domain from '../../src/models/domain';
import GroupConfig from '../../src/models/group-config';
import Config from '../../src/models/config';
import Component from '../../src/models/component';
import History from '../../src/models/history';
import { Metric } from '../../src/models/metric';
import { Environment, EnvType } from '../../src/models/environment';
import { ConfigStrategy, StrategiesType, OperationsType } from '../../src/models/config-strategy';
import { ActionTypes, RouterTypes, Role } from '../../src/models/role';
import { Team } from '../../src/models/team';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';

export const adminMasterAccountId = new mongoose.Types.ObjectId()
export const adminMasterAccountToken = jwt.sign({ _id: adminMasterAccountId }, process.env.JWT_SECRET)
export const adminMasterAccount = {
    _id: adminMasterAccountId,
    name: 'Master Admin',
    email: 'master@mail.com',
    password: '123123123123',
    active: true
}

export const adminAccountId = new mongoose.Types.ObjectId()
export const adminAccountToken = jwt.sign({ _id: adminAccountId }, process.env.JWT_SECRET)
export const adminAccount = {
    _id: adminAccountId,
    name: 'Admin',
    email: 'admin@mail.com',
    password: 'asdasdasdasd',
    active: true
}

export let apiKey = undefined
export const domainId = new mongoose.Types.ObjectId()
export const domainDocument = {
    _id: domainId,
    name: 'Domain',
    lastUpdate: 5,
    description: 'Test Domain',
    activated: new Map().set(EnvType.DEFAULT, true),
    owner: adminMasterAccountId
}

export const environment1Id = new mongoose.Types.ObjectId()
export const environment1 = {
    _id: environment1Id,
    name: EnvType.DEFAULT,
    domain: domainId,
    owner: adminMasterAccountId
}

export const environment2Id = new mongoose.Types.ObjectId()
export const environment2 = {
    _id: environment2Id,
    name: 'QA',
    domain: domainId,
    owner: adminMasterAccountId
}

export const groupConfigId = new mongoose.Types.ObjectId()
export const groupConfigDocument = {
    _id: groupConfigId,
    name: 'Group Test',
    description: 'Test Group',
    activated: new Map().set(EnvType.DEFAULT, true),
    owner: adminMasterAccountId,
    domain: domainId
}

export const keyConfigPrdQA = 'TEST_CONFIG_KEY_PRD_QA'
export const configPrdQAId = new mongoose.Types.ObjectId()
export const configPrdQADocument = {
    _id: configPrdQAId,
    key: keyConfigPrdQA,
    description: 'Test config 2 - Off in PRD and ON in QA',
    activated: { 
        [`${EnvType.DEFAULT}`]: false,
        QA: true
    },
    owner: adminMasterAccountId,
    group: groupConfigId,
    domain: domainId
}

export const keyConfig = 'TEST_CONFIG_KEY'
export const configId = new mongoose.Types.ObjectId()
export const configDocument = {
    _id: configId,
    key: keyConfig,
    description: 'Test config 1',
    activated: new Map().set(EnvType.DEFAULT, true),
    owner: adminMasterAccountId,
    components: [],
    group: groupConfigId,
    domain: domainId
}

export const configStrategyUSERId = new mongoose.Types.ObjectId()
export const configStrategyUSERDocument = {
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

export const configStrategyCIDRId = new mongoose.Types.ObjectId()
export const configStrategyCIDRDocument = {
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

export const configStrategyTIME_GREATId = new mongoose.Types.ObjectId()
export const configStrategyTIME_GREATDocument = {
    _id: configStrategyTIME_GREATId,
    description: 'Test config strategy Date Validation',
    activated: new Map().set(EnvType.DEFAULT, false),
    owner: adminMasterAccountId,
    config: configId,
    operation: OperationsType.GREATER,
    strategy: StrategiesType.DATE,
    values: ['2019-12-01T13:00'],
    domain: domainId
}

export const configStrategyTIME_BETWEENId = new mongoose.Types.ObjectId()
export const configStrategyTIME_BETWEENDocument = {
    _id: configStrategyTIME_BETWEENId,
    description: 'Test config strategy TIME_VALIDATION',
    activated: new Map().set(EnvType.DEFAULT, false),
    owner: adminMasterAccountId,
    config: configId,
    operation: OperationsType.BETWEEN,
    strategy: StrategiesType.TIME,
    values: ['13:00', '14:00'],
    domain: domainId
}

export const component1Id = new mongoose.Types.ObjectId()
export const component1 = {
    _id: component1Id,
    name: 'TestApp',
    description: 'Test app',
    domain: domainId,
    owner: adminMasterAccountId
}
configDocument.components.push(component1Id);

export const roleConfigsId = new mongoose.Types.ObjectId()
export const roleConfigs = {
    _id: roleConfigsId,
    action: ActionTypes.READ,
    active: true,
    router: RouterTypes.CONFIG
}

export const teamId = new mongoose.Types.ObjectId()
export const team = {
    _id: teamId,
    domain: domainId,
    name: 'Team Dev',
    active: true,
    roles: [roleConfigsId]
}

export const setupDatabase = async () => {
    await ConfigStrategy.deleteMany()
    await Config.deleteMany()
    await GroupConfig.deleteMany()
    await Domain.deleteMany()
    await Admin.deleteMany()
    await Environment.deleteMany()
    await Component.deleteMany()
    await History.deleteMany()
    await Metric.deleteMany()
    await Team.deleteMany()
    await Role.deleteMany()

    const refreshTokenMaster = await bcrypt.hash(adminMasterAccountToken.split('.')[2], 8)
    adminMasterAccount.token = refreshTokenMaster;
    await new Admin(adminMasterAccount).save()

    const refreshToken = await bcrypt.hash(adminAccountToken.split('.')[2], 8)
    adminAccount.token = refreshToken;
    adminAccount.teams = [teamId];
    await new Admin(adminAccount).save()

    await new Domain(domainDocument).save()
    await new Environment(environment1).save()
    await new Environment(environment2).save()

    await new Team(team).save()
    await new Role(roleConfigs).save()

    await new GroupConfig(groupConfigDocument).save()
    await new Config(configDocument).save()
    await new Config(configPrdQADocument).save()
    await new ConfigStrategy(configStrategyUSERDocument).save()
    await new ConfigStrategy(configStrategyCIDRDocument).save()
    await new ConfigStrategy(configStrategyTIME_BETWEENDocument).save()
    await new ConfigStrategy(configStrategyTIME_GREATDocument).save()

    apiKey = await bcrypt.hash(component1._id + component1.name, 8)
    const hash = await bcrypt.hash(apiKey, 8)
    component1.apihash = hash
    await new Component(component1).save()
}