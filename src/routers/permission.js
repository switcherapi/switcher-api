import express from 'express';
import { body, check, query } from 'express-validator';
import { auth } from '../middleware/auth.js';
import { RouterTypes, ActionTypes, getKeysByRouter } from '../models/permission.js';
import { validate, verifyInputUpdateParameters } from '../middleware/validators.js';
import { verifyOwnership } from '../helpers/index.js';
import { responseException } from '../exceptions/index.js';
import * as Services from '../services/permission.js';
import { getTeamById } from '../services/team.js';

const router = new express.Router();

async function updatePermission(req, res) {
    try {
        const permission = await Services.updatePermission(req.body, req.params.id, req.admin);
        res.send(permission);
    } catch (e) {
        responseException(res, e, 400);
    }
}

const sanitizeBody = [
    body('action').isString().optional(),
    body('active').isBoolean().optional(),
    body('router').isString().optional(),
    body('identifiedBy').isString().optional(),
    body('values').isArray().optional(),
    body('environments').isArray().optional()
];

router.post('/permission/create/:team', auth, [
    check('team').isMongoId(),
    ...sanitizeBody
], validate, verifyInputUpdateParameters([
    'action', 'active', 'router', 'identifiedBy', 'values', 'environments'
]), async (req, res) => {
    try {
        const permission = await Services.createPermission(req.body, req.params.team, req.admin);
        res.status(201).send(permission);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.get('/permission/routers', auth, (_req, res) => {
    res.send({
        routersAvailable: Object.values(RouterTypes)
    });
});

router.get('/permission/spec/router/:router', auth, (req, res) => {
    try {
        const result = getKeysByRouter(req.params.router);
        res.send(result);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.get('/permission/actions', auth, (_req, res) => {
    res.send({
        actionsAvailable: Object.values(ActionTypes)
    });
});

// GET /permission?team=ID
router.get('/permission', auth, [
    query('team').isMongoId()
], validate, async (req, res) => {
    try {
        const team = await getTeamById(req.query.team);
        await verifyOwnership(req.admin, team, team.domain, ActionTypes.READ, RouterTypes.ADMIN);

        const permissions = await Services.getPermissions({ _id: { $in: team.permissions } });
        res.send(permissions);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.get('/permission/:id', auth, [
    check('id').isMongoId()
], validate, async (req, res) => {
    try {
        const permission = await Services.getPermissionById(req.params.id, true);
        res.send(permission);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.patch('/permission/:id', auth, [
    check('id').isMongoId(),
    ...sanitizeBody
], validate, verifyInputUpdateParameters([
    'action', 'active', 'router', 'identifiedBy', 'values', 'environments'
]), async (req, res) => {
    await updatePermission(req, res);
});

router.delete('/permission/:id', auth, [
    check('id').isMongoId()
], validate, async (req, res) => {
    try {
        const permission = await Services.deletePermission(req.params.id, req.admin);
        res.send(permission);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.patch('/permission/value/add/:id', auth, verifyInputUpdateParameters(['id', 'value']), [
    check('id').isMongoId(),
    check('value').isString()
], validate, async (req, res) => {
    try {
        const permission = await Services.addValue(req.body, req.params.id, req.admin);
        res.send(permission);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.patch('/permission/value/remove/:id', auth, verifyInputUpdateParameters(['id', 'value']), [
    check('id').isMongoId(),
    check('value').isString()
], validate, async (req, res) => {
    try {
        const permission = await Services.removeValue(req.body, req.params.id, req.admin);
        res.send(permission);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.patch('/permission/updateValues/:id', auth, [
    check('id').isMongoId()
], validate, async (req, res) => {
    await updatePermission(req, res);
});

export default router;