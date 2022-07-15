import { BadRequestError, NotFoundError } from '../exceptions';
import { ActionTypes, Permission, RouterTypes } from '../models/permission';
import { verifyOwnership } from '../helpers';
import { response } from './common';
import { getTeam, getTeams, verifyRequestedTeam } from './team';

async function verifyRequestedTeamByPermission(permissionId, admin, action) {
    let team = await getTeam({ permissions: permissionId });
    return verifyOwnership(admin, team, team.domain, action, RouterTypes.ADMIN);
}

async function verifyPermissionValueInput(permissionId, value) {
    if (!value) {
        throw new BadRequestError('The attribute \'value\' must be assigned');
    }
    return getPermissionById(permissionId);
}

export async function getPermissionById(id, lean = false) {
    let permission = lean ? await Permission.findById(id).lean() : await Permission.findById(id);
    return response(permission, 'Permission not found');
}

export async function getPermissions(where) {
    return Permission.find(where).lean();
}

export async function getPermission(where) {
    const query = Permission.findOne();

    if (where._id) query.where('_id', where._id);
    if (where.action) query.where('action', where.action);
    if (where.active) query.where('active', where.active);
    if (where.router) query.where('router', where.router);

    return query.exec();
}

export async function createPermission(args, teamId, admin) {
    const permission = new Permission({
        ...args
    });

    await permission.save();

    const team = await verifyRequestedTeam(teamId, admin, ActionTypes.CREATE);
    team.permissions.push(permission._id);
    await team.save();
    return permission;
}

export async function updatePermission(args, id, admin) {
    const permission = await getPermissionById(id);
    await verifyRequestedTeamByPermission(permission._id, admin, ActionTypes.UPDATE);

    const updates = Object.keys(args);
    updates.forEach((update) => permission[update] = args[update]);
    return permission.save();
}

export async function deletePermission(id, admin) {
    const permission = await getPermissionById(id);
    await verifyRequestedTeamByPermission(permission._id, admin, ActionTypes.DELETE);

    const teams = await getTeams({ permissions: permission._id });
    teams.forEach(team => {
        const indexValue = team.permissions.indexOf(permission._id);
        team.permissions.splice(indexValue, 1);
        team.save();
    });
    
    return permission.remove();
}

export async function addValue(args, id, admin) {
    const permission = await verifyPermissionValueInput(id, args.value);
    await verifyRequestedTeamByPermission(permission._id, admin, ActionTypes.UPDATE);

    const value = args.value.trim();
    if (permission.values.includes(value)) {
        throw new BadRequestError(`Value '${value}' already exist`);
    }

    permission.values.push(value);
    return permission.save();
}

export async function removeValue(args, id, admin) {
    const permission = await verifyPermissionValueInput(id, args.value);
    await verifyRequestedTeamByPermission(permission._id, admin, ActionTypes.UPDATE);

    const value = args.value.trim();
    const indexValue = permission.values.indexOf(value);

    if (indexValue < 0) {
        throw new NotFoundError(`Value '${value}' does not exist`);
    }

    permission.values.splice(indexValue, 1);
    return permission.save();
}