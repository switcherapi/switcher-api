import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { Metric } from '../../src/models/metric';
import Admin from '../../src/models/admin';
import { EnvType } from '../../src/models/environment';

export const adminMasterAccountId = new mongoose.Types.ObjectId()
export const adminMasterAccountToken = jwt.sign({ _id: adminMasterAccountId }, process.env.JWT_SECRET)
export const adminMasterAccount = {
    _id: adminMasterAccountId,
    name: 'Metric Admin',
    email: 'metric@admin.com',
    password: '123123123123',
    active: true
}

export const domainId = new mongoose.Types.ObjectId()
export const entry1 = {
    _id: new mongoose.Types.ObjectId(),
    key: 'KEY_1',
    component: 'Component 1',
    result: true,
    reason: 'Success',
    group: 'GROUP 1',
    environment: EnvType.DEFAULT,
    domain: domainId,
    date: '2019-12-14 17:00'
}

export const entry2 = {
    _id: new mongoose.Types.ObjectId(),
    key: 'KEY_1',
    component: 'Component 1',
    result: false,
    reason: 'Something went wrong',
    group: 'GROUP 1',
    environment: EnvType.DEFAULT,
    domain: domainId,
    date: '2019-12-14 18:00'
}

export const entry3 = {
    _id: new mongoose.Types.ObjectId(),
    key: 'KEY_2',
    component: 'Component 1',
    result: true,
    reason: 'Success',
    group: 'GROUP 1',
    environment: EnvType.DEFAULT,
    domain: domainId,
    date: '2019-12-14 19:00'
}

export const entry4 = {
    _id: new mongoose.Types.ObjectId(),
    key: 'KEY_2',
    component: 'Component 2',
    result: false,
    reason: 'Something went wrong',
    group: 'GROUP 1',
    environment: EnvType.DEFAULT,
    domain: domainId,
    date: '2019-12-14 20:00'
}

export const entry5 = {
    _id: new mongoose.Types.ObjectId(),
    key: 'KEY_2',
    component: 'Component 2',
    result: false,
    reason: 'Something went wrong in QA',
    group: 'GROUP 1',
    environment: 'QA',
    domain: domainId,
    date: '2019-12-13 18:00'
}

export const setupDatabase = async () => {
    await Metric.deleteMany()
    await Admin.deleteMany()

    const refreshTokenMaster = await bcrypt.hash(adminMasterAccountToken.split('.')[2], 8)
    adminMasterAccount.token = refreshTokenMaster;
    await new Admin(adminMasterAccount).save()

    await new Metric(entry1).save()
    await new Metric(entry2).save()
    await new Metric(entry3).save()
    await new Metric(entry4).save()
}