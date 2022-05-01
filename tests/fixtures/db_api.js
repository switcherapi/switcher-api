import mongoose from 'mongoose';
import jwt from 'jsonwebtoken';
import Admin from '../../src/models/admin';
import Domain from '../../src/models/domain';
import GroupConfig from '../../src/models/group-config';
import { Config } from '../../src/models/config';
import Component from '../../src/models/component';
import History from '../../src/models/history';
import TeamInvite from '../../src/models/team-invite';
import { Team } from '../../src/models/team';
import { Role, ActionTypes, RouterTypes } from '../../src/models/role';
import { Metric } from '../../src/models/metric';
import { EnvType, Environment } from '../../src/models/environment';
import { ConfigStrategy, StrategiesType, OperationsType } from '../../src/models/config-strategy';
import Slack from '../../src/models/slack';

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

export const domainId = new mongoose.Types.ObjectId();
export const domainDocument = {
    _id: domainId,
    name: 'Domain',
    description: 'Test Domain',
    activated: new Map().set(EnvType.DEFAULT, true),
    owner: adminMasterAccountId
};

export const role1Id = new mongoose.Types.ObjectId();
export const role1 = {
    _id: role1Id,
    action: ActionTypes.READ,
    active: true,
    router: RouterTypes.GROUP
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

export const configId1 = new mongoose.Types.ObjectId();
export const config1Document = {
    _id: configId1,
    key: 'TEST_CONFIG_KEY_1',
    description: 'Test config 1',
    activated: new Map().set(EnvType.DEFAULT, true),
    owner: adminMasterAccountId,
    group: groupConfigId,
    domain: domainId
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

export const roleAll1Id = new mongoose.Types.ObjectId();
export const roleAll1 = {
    _id: roleAll1Id,
    action: ActionTypes.CREATE,
    active: true,
    router: RouterTypes.ALL
};

export const roleAll2Id = new mongoose.Types.ObjectId();
export const roleAll2 = {
    _id: roleAll2Id,
    action: ActionTypes.READ,
    active: true,
    router: RouterTypes.ALL
};

export const roleAll3Id = new mongoose.Types.ObjectId();
export const roleAll3 = {
    _id: roleAll3Id,
    action: ActionTypes.UPDATE,
    active: true,
    router: RouterTypes.ALL
};

export const roleAll4Id = new mongoose.Types.ObjectId();
export const roleAll4 = {
    _id: roleAll4Id,
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
    roles: [roleAll1Id, roleAll2Id, roleAll3Id, roleAll4Id]
};

export const team1Id = new mongoose.Types.ObjectId();
export const team1 = {
    _id: team1Id,
    domain: domainId,
    name: 'Team 1',
    active: true,
    roles: [role1Id]
};

export const teamInviteNoTeam = {
    _id: new mongoose.Types.ObjectId(),
    teamid: new mongoose.Types.ObjectId(),
    email: 'admin@mail.com'
};

export const slack = {
    _id: new mongoose.Types.ObjectId(),
    team_id: 'TEAM_ID',
    user_id: 'USER_ID',
    domain: domainId,
    installation_payload : {
        incoming_webhook_channel : 'Approval Team',
        incoming_webhook_channel_id : 'CHANNEL_ID'
    },
};

export const setupDatabase = async () => {
    await ConfigStrategy.deleteMany();
    await Config.deleteMany();
    await GroupConfig.deleteMany();
    await Domain.deleteMany();
    await Admin.deleteMany();
    await Environment.deleteMany();
    await Component.deleteMany();
    await Slack.deleteMany();

    await History.deleteMany();
    await Metric.deleteMany();

    await Team.deleteMany();
    await TeamInvite.deleteMany();
    await Role.deleteMany();

    adminMasterAccount.token = Admin.extractTokenPart(adminMasterAccountToken);
    await new Admin(adminMasterAccount).save();

    adminAccount.token = Admin.extractTokenPart(adminAccountToken);
    await new Admin(adminAccount).save();

    await new Environment(environment1).save();
    await new Domain(domainDocument).save();
    await new GroupConfig(groupConfigDocument).save();
    await new Config(config1Document).save();
    await new Config(config2Document).save();
    await new ConfigStrategy(configStrategyDocument).save();
    await new TeamInvite(teamInviteNoTeam).save();
    await new Slack(slack).save();
    await new Team(team1).save();
    await new Team(team).save();
    await new Role(role1).save();
    await new Role(roleAll1).save();
    await new Role(roleAll2).save();
    await new Role(roleAll3).save();
    await new Role(roleAll4).save();
};