import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
import Admin from '../../src/models/admin';
import Domain from '../../src/models/domain';
import { Team } from '../../src/models/team';
import { Role, RouterTypes, ActionTypes, KeyTypes } from '../../src/models/role';
import { EnvType } from '../../src/models/environment';
import GroupConfig from '../../src/models/group-config';
import Config from '../../src/models/config';
import TeamInvite from '../../src/models/team-invite';

export const adminMasterAccountId = new mongoose.Types.ObjectId()
export const adminMasterAccount = {
    _id: adminMasterAccountId,
    name: 'Owner Admin',
    email: 'owner@admin.com',
    password: '123123123123',
    active: true
}

export const domainId = new mongoose.Types.ObjectId()
export const domainDocument = {
    _id: domainId,
    name: 'Team Domain',
    description: 'Team Domain',
    activated: new Map().set(EnvType.DEFAULT, true),
    owner: adminMasterAccountId
}

export const groupConfigId = new mongoose.Types.ObjectId()
export const groupConfigDocument = {
    _id: groupConfigId,
    name: 'Group Team Test',
    description: 'Test Group',
    activated: new Map().set(EnvType.DEFAULT, true),
    owner: adminMasterAccountId,
    domain: domainId
}

export const groupConfig2Id = new mongoose.Types.ObjectId()
export const groupConfig2Document = {
    _id: groupConfig2Id,
    name: 'Group Team Test 2',
    description: 'Test Group 2',
    activated: new Map().set(EnvType.DEFAULT, true),
    owner: adminMasterAccountId,
    domain: domainId
}

export const keyConfig = 'CONFIG_TEAM_KEY'
export const configId = new mongoose.Types.ObjectId()
export const configDocument = {
    _id: configId,
    key: keyConfig,
    description: 'Test Team config 1',
    activated: new Map().set(EnvType.DEFAULT, true),
    owner: adminMasterAccountId,
    group: groupConfigId,
    domain: domainId
}

export const role1Id = new mongoose.Types.ObjectId()
export const role1 = {
    _id: role1Id,
    action: ActionTypes.DELETE,
    active: true,
    router: RouterTypes.CONFIG
}

export const role2Id = new mongoose.Types.ObjectId()
export const role2 = {
    _id: role2Id,
    action: ActionTypes.READ,
    active: true,
    router: RouterTypes.GROUP,
    identifiedBy: KeyTypes.NAME,
    values: [groupConfig2Document.name]
}

export const role3Id = new mongoose.Types.ObjectId()
export const role3 = {
    _id: role3Id,
    action: ActionTypes.READ,
    active: true,
    router: RouterTypes.CONFIG,
    identifiedBy: KeyTypes.KEY,
    values: ['RANDOM_VALUE']
}

export const role4Id = new mongoose.Types.ObjectId()
export const role4 = {
    _id: role4Id,
    action: ActionTypes.READ,
    active: true,
    router: RouterTypes.ALL
}

export const team1Id = new mongoose.Types.ObjectId()
export const team1 = {
    _id: team1Id,
    domain: domainId,
    name: 'Team 1',
    active: true,
    roles: [role1Id, role2Id, role3Id]
}

export const team2Id = new mongoose.Types.ObjectId()
export const team2 = {
    _id: team2Id,
    domain: domainId,
    name: 'Team 2',
    active: true,
    roles: [role4Id]
}

export const adminAccountId = new mongoose.Types.ObjectId()
export const adminAccount = {
    _id: adminAccountId,
    name: 'Member Admin',
    email: 'member@admin.com',
    password: '123123123123',
    active: true,
    teams: [team1Id]
}

export const adminAccount2Id = new mongoose.Types.ObjectId()
export const adminAccount2 = {
    _id: adminAccount2Id,
    name: 'Not Member Admin',
    email: 'not_member@admin.com',
    password: '123123123123',
    active: true,
    teams: []
}

export const adminAccount3Id = new mongoose.Types.ObjectId()
export const adminAccount3 = {
    _id: adminAccount3Id,
    name: 'Member Admin 3',
    email: 'member3@admin.com',
    password: '123123123123',
    active: true,
    teams: [team2Id]
}

export const setupDatabase = async () => {
    await Config.deleteMany();
    await GroupConfig.deleteMany();
    await Domain.deleteMany();
    await Admin.deleteMany();
    await Team.deleteMany();
    await TeamInvite.deleteMany();
    await Role.deleteMany();

    await new Admin(adminMasterAccount).save();
    await new Admin(adminAccount).save();
    await new Admin(adminAccount2).save();
    await new Admin(adminAccount3).save();

    const apiKey = await bcrypt.hash(domainDocument._id + 'Domain', 8);
    const hash = await bcrypt.hash(apiKey, 8);
    domainDocument.apihash = hash;
    await new Domain(domainDocument).save();

    await new GroupConfig(groupConfigDocument).save();
    await new GroupConfig(groupConfig2Document).save();
    await new Config(configDocument).save();
    await new Role(role1).save();
    await new Role(role2).save();
    await new Role(role3).save();
    await new Role(role4).save();
    await new Team(team1).save();
    await new Team(team2).save();
}