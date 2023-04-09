import { BadRequestError, NotFoundError } from '../exceptions';
import { checkTeam } from '../external/switcher-api-facade';
import Admin from '../models/admin';
import { ActionTypes, checkActionType, Permission, RouterTypes } from '../models/permission';
import { addDefaultPermission, Team } from '../models/team';
import TeamInvite from '../models/team-invite';
import { verifyOwnership } from '../helpers';
import { response } from './common';

async function addMemberToTeam(admin, team) {
    if (!admin) {
        throw new NotFoundError('User not found');
    }

    if (admin.teams.includes(team._id)) {
        throw new BadRequestError(`User '${admin.name}' already joined in '${team.name}'`);
    }

    team.members.push(admin._id);
    admin.teams.push(team._id);
    await team.save();
    await admin.save();
}

export async function verifyRequestedTeam(teamId, admin, action) {
    let team = await getTeamById(teamId);
    return verifyOwnership(admin, team, team.domain, action, RouterTypes.ADMIN);
}

export async function getTeamById(id) {
    let team = await Team.findById(id).exec();
    return response(team, 'Team not found');
}

export async function getTeam(where) {
    const query = Team.findOne();

    if (where.permissions) query.where('permissions', where.permissions);

    let team = await query.exec();
    return response(team, 'Team not found');
}

export async function getTeams(where, lean = false) {
    return lean ? Team.find(where).lean() : Team.find(where);
}

export async function getTeamsSort(where, projection, skip, limit, sort) {
    return Team.find(where, projection,
        {
            skip: parseInt(skip || 0),
            limit: parseInt(limit || 10),
            sort: {
                name: sort === 'desc' ? -1 : 1
            }
        }).lean();
}

export async function getTeamInviteById(id) {
    let teamInvite = await TeamInvite.findById(id).exec();
    return response(teamInvite, 'Invite request not found');
}

export async function getTeamInvites(where) {
    return TeamInvite.find(where).lean();
}

export async function getTeamInvite(where, validate = true) {
    let teamInvite = await TeamInvite.findOne(where).exec();

    if (validate)
        return response(teamInvite, 'Invite request not found');
    return teamInvite;
}

export async function getTotalTeamsByDomainId(domain) {
    return Team.find({ domain }).countDocuments();
}

export async function createTeam(args, admin, defaultActions) {
    let team = new Team({
        ...args
    });

    await checkTeam(team.domain);
    team = await verifyOwnership(admin, team, team.domain, ActionTypes.CREATE, RouterTypes.ADMIN);

    if (defaultActions) {
        const actions = defaultActions.split(',');
        checkActionType(actions);
        for (const action of actions) {
            await addDefaultPermission(action, team);
        }
    }

    return team.save();
}

export async function updateTeam(args, id, admin) {
    const team = await verifyRequestedTeam(id, admin, ActionTypes.UPDATE);

    const updates = Object.keys(args);
    updates.forEach((update) => team[update] = args[update]);
    return team.save();
}

export async function deleteTeam(id, admin) {
    const team = await verifyRequestedTeam(id, admin, ActionTypes.DELETE);
    return team.deleteOne();
}

export async function inviteMember(id, email, admin) {
    const team = await verifyRequestedTeam(id, admin, ActionTypes.UPDATE);

    let teamInvite = await getTeamInvite({ email: email.trim() }, false);
    if (!teamInvite) {
        teamInvite = new TeamInvite({
            teamid: team._id,
            email: email.trim()
        });

        await teamInvite.save();
    }
    return teamInvite;
}

export async function acceptInvite(request_id, admin) {
    const teamInvite = await getTeamInvite(
        { _id: request_id });

    await teamInvite.populate({
        path: 'team'
    });

    const team = teamInvite.team;

    if (team.length) {
        await addMemberToTeam(admin, team[0]);
        teamInvite.deleteOne();
    } else {
        await teamInvite.deleteOne();
        throw new BadRequestError('Team does not exist anymore');
    }

    return admin;
}

export async function removeInvite(request_id, id, admin) {
    await verifyRequestedTeam(id, admin, ActionTypes.UPDATE);

    const teamInvite = await getTeamInviteById(request_id);
    return teamInvite.deleteOne();
}

export async function addTeamMember(member, id, admin) {
    const team = await verifyRequestedTeam(id, admin, ActionTypes.UPDATE);

    const adminMember = await Admin.findById(member.trim()).exec();
    await addMemberToTeam(adminMember, team);
    return adminMember;
}

export async function removeTeamMember(member, id, admin) {
    const team = await verifyRequestedTeam(id, admin, ActionTypes.UPDATE);

    const adminMember = await Admin.findById(member.trim()).exec();

    if (!adminMember) {
        throw new NotFoundError('Member not found');
    }

    let indexTeam = adminMember.teams.indexOf(team._id);
    if (indexTeam < 0) {
        throw new NotFoundError(`Member '${adminMember.name}' does not belong to '${team.name}'`);
    }

    adminMember.teams.splice(indexTeam);
    indexTeam = team.members.indexOf(team._id);
    team.members.splice(indexTeam, 1);

    await team.save();
    return adminMember.save();
}

export async function removeTeamPermission(permission, id, admin) {
    const team = await verifyRequestedTeam(id, admin, ActionTypes.UPDATE);
    const permissionToRemove = await Permission.findById(permission.trim()).exec();
    
    if (!permissionToRemove) {
        throw new NotFoundError('Permission not found');
    }

    const indexPermissions = team.permissions.indexOf(permissionToRemove._id);
    await Permission.deleteOne({ _id: permission.trim() }).exec();
    team.permissions.splice(indexPermissions, 1);
    
    return team.save();
}