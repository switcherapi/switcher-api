import mongoose from 'mongoose';
import bcryptjs from 'bcryptjs';
import { randomUUID } from 'crypto';
import jwt from 'jsonwebtoken';
import Admin from '../../src/models/admin';
import Domain from '../../src/models/domain';
import GroupConfig from '../../src/models/group-config';
import { Config } from '../../src/models/config';
import Component from '../../src/models/component';
import History from '../../src/models/history';
import TeamInvite from '../../src/models/team-invite';
import { Team } from '../../src/models/team';
import { Permission, ActionTypes, RouterTypes } from '../../src/models/permission';
import { Metric } from '../../src/models/metric';
import { EnvType, Environment } from '../../src/models/environment';
import { ConfigStrategy, StrategiesType, OperationsType } from '../../src/models/config-strategy';
import { SlackTicket } from '../../src/models/slack_ticket';
import Slack from '../../src/models/slack';
import { EncryptionSalts } from '../../src/models/common';

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

export const memberAccountId = new mongoose.Types.ObjectId();
export const memberAccountToken = jwt.sign({ _id: memberAccountId }, process.env.JWT_SECRET);
export const memberAccount = {
    _id: memberAccountId,
    name: 'Member',
    email: 'member@mail.com',
    password: 'asdasdasdasd',
    active: true
};

export const memberAccount2Id = new mongoose.Types.ObjectId();
export const memberAccount2Token = jwt.sign({ _id: memberAccount2Id }, process.env.JWT_SECRET);
export const memberAccount2 = {
    _id: memberAccount2Id,
    name: 'Member 2',
    email: 'member2@mail.com',
    password: 'asdasdasdasd',
    active: true
};

export const domainId = new mongoose.Types.ObjectId();
export const domainDocument = {
    _id: domainId,
    name: 'Domain',
    description: 'Test Domain',
    activated: new Map().set(EnvType.DEFAULT, true),
    owner: adminMasterAccountId
};

export const permission1Id = new mongoose.Types.ObjectId();
export const permission1 = {
    _id: permission1Id,
    action: ActionTypes.READ,
    active: true,
    router: RouterTypes.GROUP,
    environments: [EnvType.DEFAULT, 'dev']
};

export const component1Id = new mongoose.Types.ObjectId();
export const component1Key = randomUUID();
export const component1 = {
    _id: component1Id,
    name: 'TestApp',
    description: 'Test app',
    domain: domainId,
    owner: adminMasterAccountId
};

export const environment1Id = new mongoose.Types.ObjectId();
export const environment1 = {
    _id: environment1Id,
    name: EnvType.DEFAULT,
    domain: domainId,
    owner: adminMasterAccountId
};

export const environment2Id = new mongoose.Types.ObjectId();
export const environment2 = {
    _id: environment2Id,
    name: 'dev',
    domain: domainId,
    owner: adminMasterAccountId
};

export const environment3Id = new mongoose.Types.ObjectId();
export const environment3 = {
    _id: environment3Id,
    name: 'staging',
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

export const groupConfigId2 = new mongoose.Types.ObjectId();
export const groupConfig2Document = {
    _id: groupConfigId2,
    name: 'Group Test 2',
    description: 'Test Group 2',
    activated: new Map().set(EnvType.DEFAULT, true),
    owner: adminMasterAccountId,
    domain: domainId
};

export const configId1 = new mongoose.Types.ObjectId();
export const config1Document = {
    _id: configId1,
    key: 'TEST_CONFIG_KEY_1',
    description: 'Test config 1',
    activated: new Map().set(EnvType.DEFAULT, true),
    owner: adminMasterAccountId,
    group: groupConfigId,
    domain: domainId,
    components: [component1Id]
};

export const configId2 = new mongoose.Types.ObjectId();
export const config2Document = {
    _id: configId2,
    key: 'TEST_CONFIG_KEY_2',
    description: 'Test config 2',
    activated: new Map().set(EnvType.DEFAULT, true),
    owner: adminMasterAccountId,
    group: groupConfigId,
    domain: domainId
};

export const configStrategyId = new mongoose.Types.ObjectId();
export const configStrategyDocument = {
    _id: configStrategyId,
    description: 'Test config strategy',
    activated: new Map().set(EnvType.DEFAULT, true),
    owner: adminMasterAccountId,
    config: configId1,
    operation: OperationsType.EXIST,
    strategy: StrategiesType.VALUE,
    values: ['USER_1', 'USER_2', 'USER_3'],
    domain: domainId
};

export const permissionAll1Id = new mongoose.Types.ObjectId();
export const permissionAll1 = {
    _id: permissionAll1Id,
    action: ActionTypes.CREATE,
    active: true,
    router: RouterTypes.ALL
};

export const permissionAll2Id = new mongoose.Types.ObjectId();
export const permissionAll2 = {
    _id: permissionAll2Id,
    action: ActionTypes.READ,
    active: true,
    router: RouterTypes.ALL
};

export const permissionAll3Id = new mongoose.Types.ObjectId();
export const permissionAll3 = {
    _id: permissionAll3Id,
    action: ActionTypes.UPDATE,
    active: true,
    router: RouterTypes.ALL
};

export const permissionAll4Id = new mongoose.Types.ObjectId();
export const permissionAll4 = {
    _id: permissionAll4Id,
    action: ActionTypes.DELETE,
    active: true,
    router: RouterTypes.ALL
};

export const teamId = new mongoose.Types.ObjectId();
export const team = {
    _id: teamId,
    domain: domainId,
    name: 'Team',
    active: true,
    permissions: [permissionAll1Id, permissionAll2Id, permissionAll3Id, permissionAll4Id]
};

export const team1Id = new mongoose.Types.ObjectId();
export const team1 = {
    _id: team1Id,
    domain: domainId,
    name: 'Team 1',
    active: true,
    permissions: [permission1Id]
};

export const teamInviteNoTeam = {
    _id: new mongoose.Types.ObjectId(),
    teamid: new mongoose.Types.ObjectId(),
    email: 'admin@mail.com'
};

export const slack = {
    _id: new mongoose.Types.ObjectId(),
    team_id: 'T00NZ',
    user_id: 'USER_ID',
    domain: domainId,
    settings: {
        ignored_environments: ['dev'],
        frozen_environments: ['staging']
    },
    installation_payload : {
        incoming_webhook_channel : 'Approval Team',
        incoming_webhook_channel_id : 'CHANNEL_ID'
    },
};
domainDocument.integrations = { slack: slack._id };

export const setupDatabase = async () => {
    await ConfigStrategy.deleteMany().exec();
    await Config.deleteMany().exec();
    await GroupConfig.deleteMany().exec();
    await Domain.deleteMany().exec();
    await Admin.deleteMany().exec();
    await Environment.deleteMany().exec();
    await Component.deleteMany().exec();
    await Slack.deleteMany().exec();
    await SlackTicket.deleteMany().exec();

    await History.deleteMany().exec();
    await Metric.deleteMany().exec();

    await Team.deleteMany().exec();
    await TeamInvite.deleteMany().exec();
    await Permission.deleteMany().exec();

    adminMasterAccount.token = Admin.extractTokenPart(adminMasterAccountToken);
    await new Admin(adminMasterAccount).save();

    adminAccount.token = Admin.extractTokenPart(adminAccountToken);
    await new Admin(adminAccount).save();

    memberAccount.token = Admin.extractTokenPart(memberAccountToken);
    await new Admin(memberAccount).save();

    memberAccount2.token = Admin.extractTokenPart(memberAccount2Token);
    await new Admin(memberAccount2).save();

    await new Environment(environment1).save();
    await new Environment(environment2).save();
    await new Environment(environment3).save();
    await new Domain(domainDocument).save();
    await new GroupConfig(groupConfigDocument).save();
    await new GroupConfig(groupConfig2Document).save();
    await new Config(config1Document).save();
    await new Config(config2Document).save();
    await new ConfigStrategy(configStrategyDocument).save();
    await new TeamInvite(teamInviteNoTeam).save();
    await new Slack(slack).save();
    await new Team(team1).save();
    await new Team(team).save();
    await new Permission(permission1).save();
    await new Permission(permissionAll1).save();
    await new Permission(permissionAll2).save();
    await new Permission(permissionAll3).save();
    await new Permission(permissionAll4).save();
    
    const hash = await bcryptjs.hash(component1Key, EncryptionSalts.COMPONENT);
    component1.apihash = hash;
    await new Component(component1).save();
};