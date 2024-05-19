import express from 'express';
import { auth } from '../middleware/auth.js';
import { body, check, query } from 'express-validator';
import { ActionTypes, RouterTypes } from '../models/permission.js';
import { validate, verifyInputUpdateParameters } from '../middleware/validators.js';
import { verifyOwnership } from '../helpers/index.js';
import { responseException } from '../exceptions/index.js';
import * as Services from '../services/team.js';
import { getDomainById } from '../services/domain.js';
import { SwitcherKeys } from '../external/switcher-api-facade.js';

const router = new express.Router();

router.post('/team/create', auth, verifyInputUpdateParameters(['name', 'domain']), [
    check('name').isLength({ min: 2, max: 50 }),
    check('domain').isMongoId()
], validate, async (req, res) => {
    try {
        const team = await Services.createTeam(req.body, req.admin, req.query.defaultActions);
        res.status(201).send(team);
    } catch (e) {
        responseException(res, e, 400, SwitcherKeys.ELEMENT_CREATION);
    }
});

// GET /team?domain=ID&limit=10&skip=20
// GET /team?domain=ID&sort=desc
// GET /team?domain=ID
router.get('/team', auth, [
    query('domain', 'Please, specify the \'domain\' id').isMongoId()
], validate, async (req, res) => {
    try {
        let teams = await Services.getTeamsSort(
            { domain: req.query.domain }, null, 
            req.query.skip, req.query.limit, req.query.sort);

        teams = await verifyOwnership(req.admin, teams, req.query.domain, ActionTypes.READ, RouterTypes.ADMIN);

        res.send(teams);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.get('/team/:id', auth, [
    check('id').isMongoId()
], validate, async (req, res) => {
    try {
        const team = await Services.verifyRequestedTeam(
            req.params.id, req.admin, ActionTypes.READ);

        if (req.query.resolveMembers) {
            await team.populate({ path: 'members_list' });
        }

        res.send(team);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.patch('/team/:id', auth, [
    check('id').isMongoId()
], validate, verifyInputUpdateParameters(['name', 'active']), async (req, res) => {
    try {
        const team = await Services.updateTeam(req.body, req.params.id, req.admin);
        res.send(team);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.delete('/team/:id', auth, [
    check('id').isMongoId()
], validate, async (req, res) => {
    try {
        const team = await Services.deleteTeam(req.params.id, req.admin);
        res.send(team);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.post('/team/member/invite/:id', auth, [
    check('id').isMongoId()
], validate, verifyInputUpdateParameters(['email']), async (req, res) => {
    try {
        const teamInvite = await Services.inviteMember(req.params.id, req.body.email, req.admin);
        res.status(201).send(teamInvite);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.get('/team/member/invite/:id', auth, [
    check('id').isMongoId()
], validate, async (req, res) => {
    try {
        const teamInvite = await Services.getTeamInviteById(req.params.id);

        await teamInvite.populate({
            path: 'team'
        });

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

router.get('/team/member/invite/pending/:id', auth, [
    check('id').isMongoId()
], validate, async (req, res) => {
    try {
        const teamInvites = await Services.getTeamInvites({ teamid: req.params.id });
        res.send(teamInvites);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.post('/team/member/invite/accept/:request_id', auth, [
    check('request_id').isMongoId()
], validate, async (req, res) => {
    try {
        const admin = await Services.acceptInvite(req.params.request_id, req.admin);
        res.send(admin);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.delete('/team/member/invite/remove/:id/:request_id', auth, [
    check('id').isMongoId(), 
    check('request_id').isMongoId()
], validate, async (req, res) => {
    try {
        const teamInvite = await Services.removeInvite(req.params.request_id, req.params.id, req.admin); 
        res.send(teamInvite);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.patch('/team/member/add/:id', auth, [
    check('id').isMongoId(),
    body('member').isMongoId()
], validate, verifyInputUpdateParameters(['member']), async (req, res) => {
    try {
        const adminMember = await Services.addTeamMember(req.body.member, req.params.id, req.admin);
        res.send(adminMember);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.patch('/team/member/remove/:id', auth, [
    check('id').isMongoId(),
    body('member').isMongoId()
], validate, verifyInputUpdateParameters(['member']), async (req, res) => {
    try {
        const adminMember = await Services.removeTeamMember(req.body.member, req.params.id, req.admin);
        res.send(adminMember);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.patch('/team/permission/remove/:id', auth, [
    check('id').isMongoId(),
    body('permission').isMongoId()
], validate, verifyInputUpdateParameters(['permission']), async (req, res) => {
    try {
        const team = await Services.removeTeamPermission(req.body.permission, req.params.id, req.admin);
        res.send(team);
    } catch (e) {
        responseException(res, e, 400);
    }
});

export default router;