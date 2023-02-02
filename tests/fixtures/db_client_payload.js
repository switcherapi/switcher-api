import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcryptjs from 'bcryptjs';
import { randomBytes } from 'crypto';
import Admin from '../../src/models/admin';
import Domain from '../../src/models/domain';
import GroupConfig from '../../src/models/group-config';
import { Config } from '../../src/models/config';
import Component from '../../src/models/component';
import { Environment, EnvType } from '../../src/models/environment';
import { ConfigStrategy, StrategiesType, OperationsType } from '../../src/models/config-strategy';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';

export const adminMasterAccountId = new mongoose.Types.ObjectId();
export const adminMasterAccountToken = jwt.sign({ _id: adminMasterAccountId }, process.env.JWT_SECRET);
export const adminMasterAccount = {
    _id: adminMasterAccountId,
    name: 'Master Admin',
    email: 'master@mail.com',
    password: '123123123123',
    active: true
};

export const adminAccountId = new mongoose.Types.ObjectId();
export const adminAccountToken = jwt.sign({ _id: adminAccountId }, process.env.JWT_SECRET);
export const adminAccount = {
    _id: adminAccountId,
    name: 'Admin',
    email: 'admin@mail.com',
    password: 'asdasdasdasd',
    active: true
};

export let apiKey = undefined;
export const domainId = new mongoose.Types.ObjectId();
export const domainDocument = {
    _id: domainId,
    name: 'Domain',
    lastUpdate: 5,
    description: 'Test Domain',
    activated: new Map().set(EnvType.DEFAULT, true),
    owner: adminMasterAccountId
};

export const environment1Id = new mongoose.Types.ObjectId();
export const environment1 = {
    _id: environment1Id,
    name: EnvType.DEFAULT,
    domain: domainId,
    owner: adminMasterAccountId
};

export const groupConfigId = new mongoose.Types.ObjectId();
export const groupConfigDocument = {
    _id: groupConfigId,
    name: 'Group Test',
    description: 'Test Group',
    activated: new Map().set(EnvType.DEFAULT, true),
    owner: adminMasterAccountId,
    domain: domainId
};

export const keyConfigPayload = 'TEST_CONFIG_PAYLOAD_KEY';
export const configPayloadId = new mongoose.Types.ObjectId();
export const configPayloadDocument = {
    _id: configPayloadId,
    key: keyConfigPayload,
    description: 'Test config 2 with Payload Strategy',
    activated: new Map().set(EnvType.DEFAULT, true),
    owner: adminMasterAccountId,
    components: [],
    group: groupConfigId,
    domain: domainId
};

export const configStrategyPAYLOAD_BETWEENId = new mongoose.Types.ObjectId();
export const configStrategyPAYLOAD_HAS_ONEDocument = {
    _id: configStrategyPAYLOAD_BETWEENId,
    description: 'Test config strategy PAYLOAD_VALIDATION',
    activated: new Map().set(EnvType.DEFAULT, true),
    owner: adminMasterAccountId,
    config: configPayloadId,
    operation: OperationsType.HAS_ONE,
    strategy: StrategiesType.PAYLOAD,
    values: ['username', 'login.status'],
    domain: domainId
};

export const component1Id = new mongoose.Types.ObjectId();
export const component1 = {
    _id: component1Id,
    name: 'TestApp',
    description: 'Test app',
    domain: domainId,
    owner: adminMasterAccountId
};
configPayloadDocument.components.push(component1Id);

export const setupDatabase = async () => {
    await ConfigStrategy.deleteMany().exec();
    await Config.deleteMany().exec();
    await GroupConfig.deleteMany().exec();
    await Domain.deleteMany().exec();
    await Admin.deleteMany().exec();
    await Environment.deleteMany().exec();
    await Component.deleteMany().exec();

    adminMasterAccount.token = Admin.extractTokenPart(adminMasterAccountToken);
    await new Admin(adminMasterAccount).save();

    await new Domain(domainDocument).save();
    await new Environment(environment1).save();

    await new GroupConfig(groupConfigDocument).save();
    await new Config(configPayloadDocument).save();
    await new ConfigStrategy(configStrategyPAYLOAD_HAS_ONEDocument).save();

    const buffer = randomBytes(32);
    const newApiKey = Buffer.from(buffer).toString('base64');
    const hash = await bcryptjs.hash(newApiKey, 8);
    component1.apihash = hash;
    await new Component(component1).save();
    apiKey = Buffer.from(newApiKey).toString('base64');
};