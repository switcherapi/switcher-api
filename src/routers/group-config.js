import express from 'express';
import { check, query } from 'express-validator';
import { auth } from '../middleware/auth.js';
import { validate, verifyInputUpdateParameters } from '../middleware/validators.js';
import { sortBy, verifyOwnership } from '../helpers/index.js';
import { responseException } from '../exceptions/index.js';
import { ActionTypes, RouterTypes } from '../models/permission.js';
import * as Services from '../services/group-config.js';
import { getHistory, deleteHistory } from '../services/history.js';
import { getDomainById } from '../services/domain.js';
import { SwitcherKeys } from '../external/switcher-api-facade.js';
import { getFields } from './common/index.js';

const router = new express.Router();

router.post('/groupconfig/create', auth, async (req, res) => {
    try {
        const groupconfig = await Services.createGroup(req.body, req.admin);
        res.status(201).send(groupconfig);
    } catch (e) {
        responseException(res, e, 500, SwitcherKeys.ELEMENT_CREATION);
    }
});

// GET /groupconfig?domain=ID&limit=10&skip=20
// GET /groupconfig?domain=ID&sortBy=createdAt:desc
// GET /groupconfig?domain=ID
router.get('/groupconfig', auth, [
    query('domain', 'Please, specify the \'domain\' id').isMongoId(),
    query('fields').isString().optional(),
    query('limit').isInt().optional(),
    query('skip').isInt().optional(),
    query('sortBy').isString().optional()
], validate, async (req, res) => {
    try {
        const domain = await getDomainById(req.query.domain);
        await domain.populate({
            path: 'groupConfig',
            options: {
                limit: parseInt(req.query.limit || 10),
                skip: parseInt(req.query.skip || 0),
                sort: sortBy(req.query)
            }
        });

        let groups = domain.groupConfig;
        groups = await verifyOwnership(req.admin, groups, domain._id, ActionTypes.READ, RouterTypes.GROUP, true);
        await Services.populateAdmin(groups);

        if (req.query.fields) {
            groups = getFields(groups, req.query.fields);
        }

        res.send(groups);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.get('/groupconfig/:id', auth, [
    check('id').isMongoId()
], validate, async (req, res) => {
    try {
        let groupconfig = await Services.getGroupConfigById(req.params.id, false, true);
        groupconfig = await verifyOwnership(req.admin, groupconfig, groupconfig.domain, ActionTypes.READ, RouterTypes.GROUP, true);

        res.send(groupconfig);
    } catch (e) {
        responseException(res, e, 500);
    }
});

// GET /groupconfig/ID?sortBy=date:desc
// GET /groupconfig/ID?limit=10&skip=20
// GET /groupconfig/ID
router.get('/groupconfig/history/:id', auth, [
    check('id').isMongoId()
], validate, async (req, res) => {
    try {
        const groupconfig = await Services.getGroupConfigById(req.params.id);

        const query = 'oldValue newValue updatedBy date -_id';
        const history = await getHistory(query, groupconfig.domain, groupconfig._id, req.query);

        await verifyOwnership(req.admin, groupconfig, groupconfig.domain, ActionTypes.READ, RouterTypes.GROUP, true);

        res.send(history);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.delete('/groupconfig/history/:id', auth, [
    check('id').isMongoId()
], validate, async (req, res) => {
    try {
        const groupconfig = await Services.getGroupConfigById(req.params.id);
        await verifyOwnership(req.admin, groupconfig, groupconfig.domain, ActionTypes.DELETE, RouterTypes.ADMIN);

        await deleteHistory(groupconfig.domain, groupconfig._id);
        res.send(groupconfig);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.delete('/groupconfig/:id', auth, [
    check('id').isMongoId()
], validate, async (req, res) => {
    try {
        let groupconfig = await Services.deleteGroup(req.params.id, req.admin);
        res.send(groupconfig);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.patch('/groupconfig/:id', auth, verifyInputUpdateParameters([
    'name', 'description'
]), [
    check('id').isMongoId()
], validate, async (req, res) => {
    try {
        const groupconfig = await Services.updateGroup(req.params.id, req.body, req.admin);
        res.send(groupconfig);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.patch('/groupconfig/updateStatus/:id', auth, [
    check('id').isMongoId()
], validate, async (req, res) => {
    try {
        const groupconfig = await Services.updateGroupStatusEnv(req.params.id, req.body, req.admin);
        res.send(groupconfig);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.patch('/groupconfig/removeStatus/:id', auth, [
    check('id').isMongoId()
], validate, async (req, res) => {
    try {
        const groupconfig = await Services.removeGroupStatusEnv(req.params.id, req.body.env, req.admin);
        res.send(groupconfig);
    } catch (e) {
        responseException(res, e, 500);
    }
});

export default router;