import express from 'express';
import { auth } from '../middleware/auth';
import { check, query } from 'express-validator';
import { ActionTypes, RouterTypes } from '../models/role';
import { validate, verifyInputUpdateParameters } from '../middleware/validators';
import { verifyOwnership } from './common/index';
import { responseException } from '../exceptions';
import * as Controller from '../controller/team';
import { getDomainById } from '../controller/domain';

const router = new express.Router();

router.post('/team/create', [check('name').isLength({ min: 2, max: 50 })], 
    validate, auth, async (req, res) => {
    try {
        const team = await Controller.createTeam(req.body, req.admin, req.query.defaultActions);
        res.status(201).send(team);
    } catch (e) {
        responseException(res, e, 400);
    }
});

// GET /team?domain=ID&limit=10&skip=20
// GET /team?domain=ID&sort=desc
// GET /team?domain=ID
router.get('/team', [query('domain', 'Please, specify the \'domain\' id').isMongoId()], 
    validate, auth, async (req, res) => {
    try {
        let teams = await Controller.getTeamsSort(
            { domain: req.query.domain }, null, 
            req.query.skip, req.query.limit, req.query.sort);

        teams = await verifyOwnership(req.admin, teams, req.query.domain, ActionTypes.READ, RouterTypes.ADMIN);

        res.send(teams);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.get('/team/:id', [check('id').isMongoId()], 
    validate, auth, async (req, res) => {
    try {
        const team = await Controller.verifyRequestedTeam(
            req.params.id, req.admin, ActionTypes.READ);

        if (req.query.resolveMembers) {
            await team.populate({ path: 'members_list' }).execPopulate();
        }

        res.send(team);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.patch('/team/:id', [check('id').isMongoId()], 
    validate, auth, verifyInputUpdateParameters(['name', 'active']), async (req, res) => {
    try {
        const team = await Controller.updateTeam(req.body, req.params.id, req.admin);
        res.send(team);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.delete('/team/:id', [check('id').isMongoId()], 
    validate, auth, async (req, res) => {
    try {
        const team = await Controller.deleteTeam(req.params.id, req.admin);
        res.send(team);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.post('/team/member/invite/:id', [check('id').isMongoId()], 
    validate, auth, verifyInputUpdateParameters(['email']), async (req, res) => {
    try {
        const teamInvite = await Controller.inviteMember(req.params.id, req.body.email, req.admin);
        res.status(201).send(teamInvite);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.get('/team/member/invite/:id', [check('id').isMongoId()], 
    validate, auth, async (req, res) => {
    try {
        const teamInvite = await Controller.getTeamInviteById(req.params.id);

        await teamInvite.populate({
            path: 'team'
        }).execPopulate();

        const team = teamInvite.team;
        const domain = await getDomainById(team[0].domain);
        res.send({
            team: team[0].name,
            domain: domain.name
        });
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.get('/team/member/invite/pending/:id', [check('id').isMongoId()], 
    validate, auth, async (req, res) => {
    try {
        const teamInvites = await Controller.getTeamInvites({ teamid: req.params.id });
        res.send(teamInvites);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.post('/team/member/invite/accept/:request_id', [check('request_id').isMongoId()], 
    validate, auth, async (req, res) => {
    try {
        const admin = await Controller.acceptInvite(req.params.request_id, req.admin);
        res.send(admin);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.delete('/team/member/invite/remove/:id/:request_id', [
    check('id').isMongoId(), check('request_id').isMongoId()], 
    validate, auth, async (req, res) => {
    try {
        const teamInvite = await Controller.removeInvite(req.params.request_id, req.params.id, req.admin); 
        res.send(teamInvite);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.patch('/team/member/add/:id', [check('id').isMongoId()], 
    validate, auth, verifyInputUpdateParameters(['member']), async (req, res) => {
    try {
        const adminMember = await Controller.addTeamMember(req.body.member, req.params.id, req.admin);
        res.send(adminMember);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.patch('/team/member/remove/:id', [check('id').isMongoId()], 
    validate, auth, verifyInputUpdateParameters(['member']), async (req, res) => {
    try {
        const adminMember = await Controller.removeTeamMember(req.body.member, req.params.id, req.admin);
        res.send(adminMember);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.patch('/team/role/remove/:id',  [check('id').isMongoId()], 
    validate, auth, verifyInputUpdateParameters(['role']), async (req, res) => {
    try {
        const team = await Controller.removeTeamRole(req.body.role, req.params.id, req.admin);
        res.send(team);
    } catch (e) {
        responseException(res, e, 400);
    }
});

export default router;