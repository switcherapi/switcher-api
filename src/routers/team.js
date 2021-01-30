import express from 'express';
import { auth } from '../middleware/auth';
import { check, validationResult } from 'express-validator';
import { Team, addDefaultRole } from '../models/team';
import { Role, checkActionType, ActionTypes, RouterTypes } from '../models/role';
import { verifyInputUpdateParameters } from '../middleware/validators';
import { verifyOwnership } from './common/index';
import Admin from '../models/admin';
import TeamInvite from '../models/team-invite';
import Domain from '../models/domain';
import { checkTeam } from '../external/switcher-api-facade';
import { NotFoundError, responseException } from '../exceptions';

const router = new express.Router();

async function verifyRequestedTeam(teamId, admin, action) {
    let team = await Team.findById(teamId);
        
    if (!team) {
        throw new NotFoundError('Team not found');
    }

    return await verifyOwnership(admin, team, team.domain, action, RouterTypes.ADMIN);
}

async function addMemberToTeam(admin, team) {
    if (!admin) {
        throw new NotFoundError('User not found');
    }

    if (admin.teams.includes(team._id)) {
        throw new Error(`User '${admin.name}' already joined in '${team.name}'`);
    }

    team.members.push(admin._id);
    admin.teams.push(team._id);
    await team.save();
    await admin.save();
}

router.post('/team/create', auth, [
    check('name').isLength({ min: 2, max: 50 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    }

    let team = new Team({
        ...req.body
    });

    try {
        await checkTeam(team.domain);
        team = await verifyOwnership(req.admin, team, team.domain, ActionTypes.CREATE, RouterTypes.ADMIN);

        if (req.query.defaultActions) {
            const actions = req.query.defaultActions.split(',');
            checkActionType(actions);
            for (let index = 0; index < actions.length; index++) {
                await addDefaultRole(actions[index], team);
            }
        }

        await team.save();
        res.status(201).send(team);
    } catch (e) {
        responseException(res, e, 400);
    }
});

// GET /team?domain=ID&limit=10&skip=20
// GET /team?domain=ID&sort=desc
// GET /team?domain=ID
router.get('/team', auth, async (req, res) => {
    if (!req.query.domain) {
        return res.status(500).send({
            error: 'Please, specify the \'domain\' id'
        });
    }

    try {
        let teams = await Team.find({ domain: req.query.domain }, null,
            {
                skip: parseInt(req.query.skip),
                limit: parseInt(req.query.limit),
                sort: {
                    name: req.query.sort === 'desc' ? -1 : 1
                }
            }).lean();

        teams = await verifyOwnership(req.admin, teams, req.query.domain, ActionTypes.READ, RouterTypes.ADMIN);

        res.send(teams);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.get('/team/:id', auth, async (req, res) => {
    try {
        const team = await verifyRequestedTeam(req.params.id, req.admin, ActionTypes.READ);

        if (req.query.resolveMembers) {
            await team.populate({ path: 'members_list' }).execPopulate();
        }

        res.send(team);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.patch('/team/:id', auth, verifyInputUpdateParameters(['name', 'active']), async (req, res) => {
    try {
        const team = await verifyRequestedTeam(req.params.id, req.admin, ActionTypes.UPDATE);
        req.updates.forEach((update) => team[update] = req.body[update]);
        await team.save();
        res.send(team);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.delete('/team/:id', auth, async (req, res) => {
    try {
        const team = await verifyRequestedTeam(req.params.id, req.admin, ActionTypes.DELETE);
        await team.remove();
        res.send(team);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.post('/team/member/invite/:id', auth, verifyInputUpdateParameters(['email']), async (req, res) => {
    try {
        const team = await verifyRequestedTeam(req.params.id, req.admin, ActionTypes.UPDATE);
        const email = req.body.email.trim();

        let teamInvite = await TeamInvite.findOne({ email });

        if (teamInvite) {
            return res.status(200).send(teamInvite);
        } else {
            teamInvite = new TeamInvite({
                teamid: team._id,
                email: req.body.email.trim()
            });
    
            await teamInvite.save();
        }

        res.status(201).send(teamInvite);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.get('/team/member/invite/:id', auth, async (req, res) => {
    try {
        const teamInvite = await TeamInvite.findById(req.params.id);

        if (!teamInvite) {
            throw new NotFoundError('Invite request not found');
        }

        await teamInvite.populate({
            path: 'team'
        }).execPopulate();

        const team = teamInvite.team;
        const domain = await Domain.findById(team[0].domain).lean();
        res.send({
            team: team[0].name,
            domain: domain.name
        });
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.get('/team/member/invite/pending/:id', auth, async (req, res) => {
    try {
        const teamInvites = await TeamInvite.find({ teamid: req.params.id }).lean();
        res.send(teamInvites);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.post('/team/member/invite/accept/:request_id', auth, async (req, res) => {
    try {
        const teamInvite = await TeamInvite.findOne(
            { _id: req.params.request_id, email: req.admin.email });

        if (!teamInvite) {
            throw new NotFoundError('Invite request not found');
        }

        await teamInvite.populate({
            path: 'team'
        }).execPopulate();

        const team = teamInvite.team;

        if (team.length) {
            const admin = req.admin;

            await addMemberToTeam(admin, team[0]);
            teamInvite.remove();
            res.send(admin);
        } else {
            await teamInvite.remove();
            throw new Error('Team does not exist anymore');
        }
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.delete('/team/member/invite/remove/:id/:request_id', auth, async (req, res) => {
    try {
        await verifyRequestedTeam(req.params.id, req.admin, ActionTypes.UPDATE);

        const teamInvite = await TeamInvite.findById(req.params.request_id);

        if (!teamInvite) {
            throw new NotFoundError('Invite request not found');
        }

        teamInvite.remove();
        res.send(teamInvite);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.patch('/team/member/add/:id', auth, verifyInputUpdateParameters(['member']), async (req, res) => {
    try {
        const team = await verifyRequestedTeam(req.params.id, req.admin, ActionTypes.UPDATE);

        const member = req.body.member.trim();
        const admin = await Admin.findById(member);

        await addMemberToTeam(admin, team);
        res.send(admin);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.patch('/team/member/remove/:id', auth, verifyInputUpdateParameters(['member']), async (req, res) => {
    try {
        const team = await verifyRequestedTeam(req.params.id, req.admin, ActionTypes.UPDATE);

        const member = req.body.member.trim();
        const admin = await Admin.findById(member);

        if (!admin) {
            return res.status(404).send({ error: 'Member not found' });
        }

        let indexTeam = admin.teams.indexOf(team._id);
        if (indexTeam < 0) {
            return res.status(404).send({ error: `Member '${admin.name}' does not belong to '${team.name}'` });
        }

        admin.teams.splice(indexTeam);
        indexTeam = team.members.indexOf(team._id);
        team.members.splice(indexTeam, 1);

        await team.save();
        await admin.save();
        res.send(admin);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.patch('/team/role/remove/:id', auth, verifyInputUpdateParameters(['role']), async (req, res) => {
    try {
        const team = await verifyRequestedTeam(req.params.id, req.admin, ActionTypes.UPDATE);
        const role = await Role.findById(req.body.role.trim());
        
        if (!role) {
            return res.status(404).send({ error: 'Role not found' });
        }

        const indexRoles = team.roles.indexOf(role._id);

        await Role.deleteOne({ _id: req.body.role });
        team.roles.splice(indexRoles, 1);
        await team.save();
        res.send(team);
    } catch (e) {
        responseException(res, e, 400);
    }
});

export default router;