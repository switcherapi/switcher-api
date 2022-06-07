import { response } from './common';
import GroupConfig from '../models/group-config';
import { formatInput, removeGroupStatus, updateDomainVersion, verifyOwnership } from '../helpers';
import { BadRequestError } from '../exceptions';
import { checkGroup } from '../external/switcher-api-facade';
import { ActionTypes, RouterTypes } from '../models/role';
import { getDomainById } from './domain';
import { checkEnvironmentStatusChange_v2 } from '../middleware/validators';

async function verifyGroupInput(groupId, admin) {
    let groupconfig = await getGroupConfigById(groupId);
    return verifyOwnership(admin, groupconfig, groupconfig.domain, ActionTypes.UPDATE, RouterTypes.GROUP);
}

export async function getGroupConfigById(id, lean = false) {
    let group = await GroupConfig.findById(id, null, { lean });
    return response(group, 'Group Config not found');
}

export async function getGroupConfigs(where, lean = false) {
    const query = GroupConfig.find();
    if (where.domain) query.where('domain', where.domain);
    if (where.name) query.where('name', where.name);
    if (lean) query.lean();
    
    return query.exec();
}

export async function getGroupConfig(where, lean = false) {
    const query = GroupConfig.findOne();

    if (where.domain) query.where('domain', where.domain);
    if (where.name) query.where('name', where.name);
    if (lean) query.lean();
    
    return query.exec();
}

export async function getTotalGroupsByDomainId(domain) {
    return GroupConfig.find({ domain }).countDocuments();
}

export async function createGroup(args, admin) {
    let groupconfig = new GroupConfig({
        ...args,
        owner: admin._id
    });

    groupconfig.name = formatInput(groupconfig.name, { allowSpace: true });

    // validates existing group config
    let group = await getGroupConfig({ name: args.name, domain: args.domain });
    if (group) {
        throw new BadRequestError(`Group ${group.name} already exist`);
    }

    const domain = await getDomainById(args.domain);
    await checkGroup(domain);

    // validates account plan permissions
    groupconfig = await verifyOwnership(admin, groupconfig, domain._id, ActionTypes.CREATE, RouterTypes.GROUP);

    // creates group config
    updateDomainVersion(domain._id);
    await groupconfig.save();

    return groupconfig;
}

export async function deleteGroup(id, admin) {
    let groupconfig = await getGroupConfigById(id);
    groupconfig = await verifyOwnership(admin, groupconfig, groupconfig.domain, ActionTypes.DELETE, RouterTypes.GROUP);

    await groupconfig.remove();
    updateDomainVersion(groupconfig.domain);

    return groupconfig;
}

export async function updateGroup(id, args, admin) {
    const groupconfig = await verifyGroupInput(id, admin);
    groupconfig.updatedBy = admin.email;

    if (args.name) {
        let groupFound = await getGroupConfig({ name: args.name, domain: groupconfig.domain });

        if (groupFound) {
            throw new BadRequestError(`Group ${args.name} already exist`);
        }
    }

    const updates = Object.keys(args);
    updates.forEach((update) => groupconfig[update] = args[update]);
    groupconfig.name = formatInput(groupconfig.name, { allowSpace: true });
    await groupconfig.save();
    updateDomainVersion(groupconfig.domain);

    return groupconfig;
}

export async function updateGroupStatusEnv(id, args, admin) {
    const groupconfig = await verifyGroupInput(id, admin);
    groupconfig.updatedBy = admin.email;

    const updates = await checkEnvironmentStatusChange_v2(args, groupconfig.domain);
    updates.forEach((update) => groupconfig.activated.set(update, args[update]));
    await groupconfig.save();
    updateDomainVersion(groupconfig.domain);

    return groupconfig;
}

export async function removeGroupStatusEnv(id, args, admin) {
    const groupconfig = await verifyGroupInput(id, admin);
    groupconfig.updatedBy = admin.email;
    updateDomainVersion(groupconfig.domain);
    return removeGroupStatus(groupconfig, args.env);
}