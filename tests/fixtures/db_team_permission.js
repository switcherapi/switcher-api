import mongoose from 'mongoose';
import Admin from '../../src/models/admin';
import Domain from '../../src/models/domain';
import { Team } from '../../src/models/team';
import { Permission, RouterTypes, ActionTypes, KeyTypes } from '../../src/models/permission';
import { EnvType } from '../../src/models/environment';
import GroupConfig from '../../src/models/group-config';
import { Config } from '../../src/models/config';
import TeamInvite from '../../src/models/team-invite';

export const adminMasterAccountId = new mongoose.Types.ObjectId();
export const adminMasterAccount = {
    _id: adminMasterAccountId,
    name: 'Owner Admin',
    email: 'owner@admin.com',
    password: '123123123123',
    active: true
};

export const domainId = new mongoose.Types.ObjectId();
export const domainDocument = {
    _id: domainId,
    name: 'Team Domain',
    description: 'Team Domain',
    activated: new Map().set(EnvType.DEFAULT, true),
    owner: adminMasterAccountId
};

export const groupConfigId = new mongoose.Types.ObjectId();
export const groupConfigDocument = {
    _id: groupConfigId,
    name: 'Group Team Test',
    description: 'Test Group',
    activated: new Map().set(EnvType.DEFAULT, true),
    owner: adminMasterAccountId,
    domain: domainId
};

export const groupConfig2Id = new mongoose.Types.ObjectId();
export const groupConfig2Document = {
    _id: groupConfig2Id,
    name: 'Group Team Test 2',
    description: 'Test Group 2',
    activated: new Map().set(EnvType.DEFAULT, true),
    owner: adminMasterAccountId,
    domain: domainId
};

export const keyConfig = 'CONFIG_TEAM_KEY';
export const configId = new mongoose.Types.ObjectId();
export const configDocument = {
    _id: configId,
    key: keyConfig,
    description: 'Test Team config 1',
    activated: new Map().set(EnvType.DEFAULT, true),
    owner: adminMasterAccountId,
    group: groupConfigId,
    domain: domainId
};

export const permission1Id = new mongoose.Types.ObjectId();
export const permission1 = {
    _id: permission1Id,
    action: ActionTypes.DELETE,
    active: true,
    router: RouterTypes.CONFIG
};

export const permission11Id = new mongoose.Types.ObjectId();
export const permission11 = {
    _id: permission11Id,
    action: ActionTypes.UPDATE,
    active: true,
    router: RouterTypes.CONFIG,
    environments: ['dev']
};

export const permission12Id = new mongoose.Types.ObjectId();
export const permission12 = {
    _id: permission12Id,
    action: ActionTypes.READ,
    active: true,
    router: RouterTypes.CONFIG,
    environments: [EnvType.DEFAULT]
};

export const permission2Id = new mongoose.Types.ObjectId();
export const permission2 = {
    _id: permission2Id,
    action: ActionTypes.READ,
    active: true,
    router: RouterTypes.GROUP,
    identifiedBy: KeyTypes.NAME,
    values: [groupConfig2Document.name]
};

export const permission21Id = new mongoose.Types.ObjectId();
export const permission21 = {
    _id: permission21Id,
    action: ActionTypes.READ,
    active: true,
    router: RouterTypes.GROUP
};

export const permission22Id = new mongoose.Types.ObjectId();
export const permission22 = {
    _id: permission22Id,
    action: ActionTypes.READ,
    active: true,
    router: RouterTypes.GROUP,
    identifiedBy: KeyTypes.NAME,
    values: ['RANDOM_VALUE']
};

export const permission3Id = new mongoose.Types.ObjectId();
export const permission3 = {
    _id: permission3Id,
    action: ActionTypes.READ,
    active: true,
    router: RouterTypes.CONFIG,
    identifiedBy: KeyTypes.KEY,
    values: ['RANDOM_VALUE']
};

export const permission4Id = new mongoose.Types.ObjectId();
export const permission4 = {
    _id: permission4Id,
    action: ActionTypes.READ,
    active: true,
    router: RouterTypes.ALL
};

export const team1Id = new mongoose.Types.ObjectId();
export const team1 = {
    _id: team1Id,
    domain: domainId,
    name: 'Team 1',
    active: true,
    permissions: [permission1Id, permission11Id, permission12Id, permission2Id, permission3Id]
};

export const team2Id = new mongoose.Types.ObjectId();
export const team2 = {
    _id: team2Id,
    domain: domainId,
    name: 'Team 2',
    active: true,
    permissions: [permission4Id]
};

export const team3Id = new mongoose.Types.ObjectId();
export const team3 = {
    _id: team3Id,
    domain: domainId,
    name: 'Team 3',
    active: true,
    permissions: [permission21Id, permission22Id]
};

export const adminAccountId = new mongoose.Types.ObjectId();
export const adminAccount = {
    _id: adminAccountId,
    name: 'Member Admin',
    email: 'member@admin.com',
    password: '123123123123',
    active: true,
    teams: [team1Id, team3Id]
};

export const adminAccount2Id = new mongoose.Types.ObjectId();
export const adminAccount2 = {
    _id: adminAccount2Id,
    name: 'Not Member Admin',
    email: 'not_member@admin.com',
    password: '123123123123',
    active: true,
    teams: []
};

export const adminAccount3Id = new mongoose.Types.ObjectId();
export const adminAccount3 = {
    _id: adminAccount3Id,
    name: 'Member Admin 3',
    email: 'member3@admin.com',
    password: '123123123123',
    active: true,
    teams: [team2Id]
};

export const setupDatabase = async () => {
    await Config.deleteMany().exec();
    await GroupConfig.deleteMany().exec();
    await Domain.deleteMany().exec();
    await Admin.deleteMany().exec();
    await Team.deleteMany().exec();
    await TeamInvite.deleteMany().exec();
    await Permission.deleteMany().exec();

    await new Admin(adminMasterAccount).save();
    await new Admin(adminAccount).save();
    await new Admin(adminAccount2).save();
    await new Admin(adminAccount3).save();
    
    await new Domain(domainDocument).save();
    await new GroupConfig(groupConfigDocument).save();
    await new GroupConfig(groupConfig2Document).save();
    await new Config(configDocument).save();
    await new Permission(permission1).save();
    await new Permission(permission11).save();
    await new Permission(permission12).save();
    await new Permission(permission2).save();
    await new Permission(permission21).save();
    await new Permission(permission22).save();
    await new Permission(permission3).save();
    await new Permission(permission4).save();
    await new Team(team1).save();
    await new Team(team2).save();
    await new Team(team3).save();
};