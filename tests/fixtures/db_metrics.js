import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Metric } from '../../src/models/metric';
import Admin from '../../src/models/admin';
import { EnvType } from '../../src/models/environment';
import GroupConfig from '../../src/models/group-config';
import Config from '../../src/models/config';
import Domain from '../../src/models/domain';
import Component from '../../src/models/component';

process.env.JWT_SECRET = process.env.JWT_SECRET || 'test_secret';

export const adminMasterAccountId = new mongoose.Types.ObjectId();
export const adminMasterAccountToken = jwt.sign({ _id: adminMasterAccountId }, process.env.JWT_SECRET);
export const adminMasterAccount = {
    _id: adminMasterAccountId,
    name: 'Metric Admin',
    email: 'metric@admin.com',
    password: '123123123123',
    active: true
}

export const adminAccountId = new mongoose.Types.ObjectId();
export const adminAccountToken = jwt.sign({ _id: adminAccountId }, process.env.JWT_SECRET);
export const adminAccount = {
    _id: adminAccountId,
    name: 'Admin',
    email: 'metric.admin@admin.com',
    password: '123123123123',
    active: true
}

export const domainId = new mongoose.Types.ObjectId();
export const domainDocument = {
    _id: domainId,
    name: 'Domain',
    description: 'Test Domain',
    activated: new Map().set(EnvType.DEFAULT, true),
    owner: adminMasterAccountId
}

export const groupConfigId = new mongoose.Types.ObjectId();
export const groupConfigDocument = {
    _id: groupConfigId,
    name: 'GROUP 1',
    description: 'Test Group Metric',
    activated: new Map().set(EnvType.DEFAULT, true),
    owner: adminMasterAccountId,
    domain: domainId
}

export const configId1 = new mongoose.Types.ObjectId();
export const config1Document = {
    _id: configId1,
    key: 'KEY_1',
    description: 'Test config 1',
    components: [],
    activated: new Map().set(EnvType.DEFAULT, true),
    owner: adminMasterAccountId,
    group: groupConfigId,
    domain: domainId
}

export const configId2 = new mongoose.Types.ObjectId();
export const config2Document = {
    _id: configId2,
    key: 'KEY_2',
    description: 'Test config 2',
    components: [],
    activated: new Map().set(EnvType.DEFAULT, true),
    owner: adminMasterAccountId,
    group: groupConfigId,
    domain: domainId
}

export const component1Id = new mongoose.Types.ObjectId();
export const component1 = {
    _id: component1Id,
    name: 'Component_1',
    description: 'Test app',
    domain: domainId,
    owner: adminMasterAccountId
}
config1Document.components.push(component1Id);
config2Document.components.push(component1Id);

export const entry1 = {
    _id: new mongoose.Types.ObjectId(),
    config: configId1,
    component: 'Component_1',
    result: true,
    reason: 'Success',
    group: 'GROUP 1',
    environment: EnvType.DEFAULT,
    domain: domainId,
    date: '2019-12-14 17:00'
}

export const entry2 = {
    _id: new mongoose.Types.ObjectId(),
    config: configId1,
    component: 'Component_1',
    result: false,
    reason: 'Something went wrong',
    group: 'GROUP 1',
    environment: EnvType.DEFAULT,
    domain: domainId,
    date: '2019-12-14 18:00'
}

export const entry3 = {
    _id: new mongoose.Types.ObjectId(),
    config: configId2,
    component: 'Component_1',
    result: true,
    reason: 'Success',
    group: 'GROUP 1',
    environment: EnvType.DEFAULT,
    domain: domainId,
    date: '2019-12-14 19:00'
}

export const entry4 = {
    _id: new mongoose.Types.ObjectId(),
    config: configId2,
    component: 'Component_2',
    result: false,
    reason: 'Something went wrong',
    group: 'GROUP 1',
    environment: EnvType.DEFAULT,
    domain: domainId,
    date: '2019-12-14 20:00'
}

export const entry5 = {
    _id: new mongoose.Types.ObjectId(),
    config: configId2,
    component: 'Component_2',
    result: false,
    reason: 'Something went wrong in QA',
    group: 'GROUP 1',
    environment: 'QA',
    domain: domainId,
    date: '2019-12-13 18:00'
}

export const setupDatabase = async () => {
    await Metric.deleteMany();
    await Admin.deleteMany();
    await Domain.deleteMany();
    await GroupConfig.deleteMany();
    await Config.deleteMany();
    await Component.deleteMany();

    const refreshTokenMaster = await bcrypt.hash(adminMasterAccountToken.split('.')[2], 8);
    adminMasterAccount.token = refreshTokenMaster;
    await new Admin(adminMasterAccount).save();

    const refreshToken = await bcrypt.hash(adminAccountToken.split('.')[2], 8);
    adminAccount.token = refreshToken;
    await new Admin(adminAccount).save();
    
    await new Domain(domainDocument).save();
    await new GroupConfig(groupConfigDocument).save();
    await new Config(config1Document).save();
    await new Config(config2Document).save();

    await new Metric(entry1).save();
    await new Metric(entry2).save();
    await new Metric(entry3).save();
    await new Metric(entry4).save();

    const apiKey = await bcrypt.hash(component1._id + component1.name, 8);
    const hash = await bcrypt.hash(apiKey, 8);
    component1.apihash = hash;
    await new Component(component1).save();
}