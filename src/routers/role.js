import express from 'express';
import { auth } from '../middleware/auth';
import { RouterTypes, ActionTypes, getKeysByRouter } from '../models/role';
import { validate, verifyInputUpdateParameters } from '../middleware/validators';
import { verifyOwnership } from '../helpers';
import { responseException } from '../exceptions';
import { check, query } from 'express-validator';
import * as Controller from '../controller/role';
import { getTeamById } from '../controller/team';

const router = new express.Router();

async function updateRole(req, res) {
    try {
        const role = await Controller.updateRole(req.body, req.params.id, req.admin);
        res.send(role);
    } catch (e) {
        responseException(res, e, 400);
    }
}

router.post('/role/create/:team', auth, [
    check('team').isMongoId()
], validate, async (req, res) => {
    try {
        const role = await Controller.createRole(req.body, req.params.team, req.admin);
        res.status(201).send(role);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.get('/role/routers', auth, (_req, res) => {
    res.send({
        routersAvailable: Object.values(RouterTypes)
    });
});

router.get('/role/spec/router/:router', auth, (req, res) => {
    try {
        const result = getKeysByRouter(req.params.router);
        res.send(result);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.get('/role/actions', auth, (_req, res) => {
    res.send({
        actionsAvailable: Object.values(ActionTypes)
    });
});

// GET /role?team=ID
router.get('/role', auth, [
    query('team').isMongoId()
], validate, async (req, res) => {
    try {
        const team = await getTeamById(req.query.team);
        await verifyOwnership(req.admin, team, team.domain, ActionTypes.READ, RouterTypes.ADMIN);

        const roles = await Controller.getRoles({ _id: { $in: team.roles } });
        res.send(roles);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.get('/role/:id', auth, [
    check('id').isMongoId()
], validate, async (req, res) => {
    try {
        const role = await Controller.getRoleById(req.params.id, true);
        res.send(role);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.patch('/role/:id', auth, verifyInputUpdateParameters([
    'action', 'active', 'router', 'identifiedBy'
]), [
    check('id').isMongoId()
], validate, async (req, res) => {
    await updateRole(req, res);
});

router.delete('/role/:id', auth, [
    check('id').isMongoId()
], validate, async (req, res) => {
    try {
        const role = await Controller.deleteRole(req.params.id, req.admin);
        res.send(role);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.patch('/role/value/add/:id', auth, verifyInputUpdateParameters(['value']), [
    check('id').isMongoId()
], validate, async (req, res) => {
    try {
        const role = await Controller.addValue(req.body, req.params.id, req.admin);
        res.send(role);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.patch('/role/value/remove/:id', auth, [
    check('id').isMongoId()
], validate, verifyInputUpdateParameters(['value']), async (req, res) => {
    try {
        const role = await Controller.removeValue(req.body, req.params.id, req.admin);
        res.send(role);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.patch('/role/updateValues/:id', auth, [
    check('id').isMongoId()
], validate, async (req, res) => {
    await updateRole(req, res);
});

export default router;