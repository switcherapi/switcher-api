import { BadRequestError, NotFoundError } from '../exceptions';
import { ActionTypes, Role, RouterTypes } from '../models/role';
import { verifyOwnership } from '../helpers';
import { response } from './common';
import { getTeam, getTeams, verifyRequestedTeam } from './team';

async function verifyRequestedTeamByRole(roleId, admin, action) {
    let team = await getTeam({ roles: roleId });
    return verifyOwnership(admin, team, team.domain, action, RouterTypes.ADMIN);
}

async function verifyRoleValueInput(roleId, value) {
    if (!value) {
        throw new BadRequestError('The attribute \'value\' must be assigned');
    }
    return getRoleById(roleId);
}

export async function getRoleById(id, lean = false) {
    let role = lean ? await Role.findById(id).lean() : await Role.findById(id);
    return response(role, 'Role not found');
}

export async function getRoles(where) {
    return Role.find(where).lean();
}

export async function getRole(where) {
    const query = Role.findOne();

    if (where._id) query.where('_id', where._id);
    if (where.action) query.where('action', where.action);
    if (where.active) query.where('active', where.active);
    if (where.router) query.where('router', where.router);

    return query.exec();
}

export async function createRole(args, teamId, admin) {
    const role = new Role({
        ...args
    });

    await role.save();

    const team = await verifyRequestedTeam(teamId, admin, ActionTypes.CREATE);
    team.roles.push(role._id);
    await team.save();
    return role;
}

export async function updateRole(args, id, admin) {
    const role = await getRoleById(id);
    await verifyRequestedTeamByRole(role._id, admin, ActionTypes.UPDATE);

    const updates = Object.keys(args);
    updates.forEach((update) => role[update] = args[update]);
    return role.save();
}

export async function deleteRole(id, admin) {
    const role = await getRoleById(id);
    await verifyRequestedTeamByRole(role._id, admin, ActionTypes.DELETE);

    const teams = await getTeams({ roles: role._id });
    teams.forEach(team => {
        const indexValue = team.roles.indexOf(role._id);
        team.roles.splice(indexValue, 1);
        team.save();
    });
    
    return role.remove();
}

export async function addValue(args, id, admin) {
    const role = await verifyRoleValueInput(id, args.value);
    await verifyRequestedTeamByRole(role._id, admin, ActionTypes.UPDATE);

    const value = args.value.trim();
    if (role.values.includes(value)) {
        throw new BadRequestError(`Value '${value}' already exist`);
    }

    role.values.push(value);
    return role.save();
}

export async function removeValue(args, id, admin) {
    const role = await verifyRoleValueInput(id, args.value);
    await verifyRequestedTeamByRole(role._id, admin, ActionTypes.UPDATE);

    const value = args.value.trim();
    const indexValue = role.values.indexOf(value);

    if (indexValue < 0) {
        throw new NotFoundError(`Value '${value}' does not exist`);
    }

    role.values.splice(indexValue, 1);
    return role.save();
}