import { response } from './common';
import GroupConfig from '../models/group-config';
import { formatInput, verifyOwnership, checkEnvironmentStatusRemoval } from '../helpers';
import { BadRequestError } from '../exceptions';
import { checkGroup } from '../external/switcher-api-facade';
import { ActionTypes, RouterTypes } from '../models/permission';
import { getDomainById, updateDomainVersion } from './domain';
import { checkEnvironmentStatusChange } from '../middleware/validators';
import { permissionCache } from '../helpers/cache';

export async function getGroupConfigById(id, lean = false, populateAdmin = false) {
    let group = await GroupConfig.findById(id, null, { lean }).exec();

    if (!lean && group && populateAdmin) {
        await group.populate({ path: 'admin', select: 'name' });
    }

    return response(group, 'Group Config not found');
}

export async function getGroupConfigs(where, lean = false) {
    const query = GroupConfig.find();
    if (where.id) query.where('_id', where.id);
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

export async function populateAdmin(groups) {
    for (const group of groups) {
        await group.populate({ path: 'admin', select: 'name' });
    }
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
    
    // resets permission cache
    permissionCache.permissionReset(domain._id, ActionTypes.ALL, RouterTypes.GROUP);

    return groupconfig;
}

export async function deleteGroup(id, admin) {
    let groupconfig = await getGroupConfigById(id);
    groupconfig = await verifyOwnership(admin, groupconfig, groupconfig.domain, ActionTypes.DELETE, RouterTypes.GROUP);

    await groupconfig.deleteOne();
    updateDomainVersion(groupconfig.domain);

    // resets permission cache
    permissionCache.permissionReset(groupconfig.domain, ActionTypes.ALL, RouterTypes.GROUP);
    permissionCache.permissionReset(groupconfig.domain, ActionTypes.ALL, RouterTypes.GROUP, groupconfig.name);

    return groupconfig;
}

export async function updateGroup(id, args, admin) {
    let groupconfig = await getGroupConfigById(id);

    groupconfig = await verifyOwnership(admin, groupconfig, groupconfig.domain, ActionTypes.UPDATE, RouterTypes.GROUP);
    groupconfig.updatedBy = admin.email;

    if (args.name) {
        let groupFound = await getGroupConfig({ name: args.name, domain: groupconfig.domain });

        if (groupFound) {
            throw new BadRequestError(`Group ${args.name} already exist`);
        }

        // resets permission cache
        permissionCache.permissionReset(groupconfig.domain, ActionTypes.ALL, RouterTypes.GROUP);
        permissionCache.permissionReset(groupconfig.domain, ActionTypes.ALL, RouterTypes.GROUP, groupconfig.name);
    }

    const updates = Object.keys(args);
    updates.forEach((update) => groupconfig[update] = args[update]);
    groupconfig.name = formatInput(groupconfig.name, { allowSpace: true });
    await groupconfig.save();
    updateDomainVersion(groupconfig.domain);

    return groupconfig;
}

export async function updateGroupStatusEnv(id, args, admin) {
     let groupconfig = await getGroupConfigById(id);
    
    groupconfig = await verifyOwnership(admin, groupconfig, groupconfig.domain, [ActionTypes.UPDATE, ActionTypes.UPDATE_ENV_STATUS],
        RouterTypes.GROUP, false, Object.keys(args)[0]);
    groupconfig.updatedBy = admin.email;

    const updates = await checkEnvironmentStatusChange(args, groupconfig.domain);
    updates.forEach((update) => groupconfig.activated.set(update, args[update]));
    await groupconfig.save();
    updateDomainVersion(groupconfig.domain);

    return groupconfig;
}

export async function removeGroupStatusEnv(id, env, admin) {
    let groupconfig = await getGroupConfigById(id);
    
    groupconfig = await verifyOwnership(admin, groupconfig, groupconfig.domain, [ActionTypes.UPDATE, ActionTypes.UPDATE_ENV_STATUS],
        RouterTypes.GROUP, false, env);
    groupconfig.updatedBy = admin.email;
    updateDomainVersion(groupconfig.domain);
    return removeGroupStatus(groupconfig, env);
}

export async function removeGroupStatus(groupconfig, environmentName) {
    try {
        await checkEnvironmentStatusRemoval(groupconfig.domain, environmentName);

        groupconfig.activated.delete(environmentName);
        return await groupconfig.save();
    } catch (e) {
        throw new Error(e.message);
    }
}