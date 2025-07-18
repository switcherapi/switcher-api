import express from 'express';
import { body, check, query } from 'express-validator';
import { relayOptions } from '../models/config.js';
import { auth } from '../middleware/auth.js';
import { ActionTypes, RouterTypes } from '../models/permission.js';
import { responseException } from '../exceptions/index.js';
import {
    validate,
    verifyInputUpdateParameters } from '../middleware/validators.js';
import { sortBy, verifyOwnership } from '../helpers/index.js';
import * as Services from '../services/config.js';
import { getHistory, deleteHistory } from '../services/history.js';
import { getGroupConfigById } from '../services/group-config.js';
import { SwitcherKeys } from '../external/switcher-api-facade.js';
import { getFields } from './common/index.js';

const router = new express.Router();

router.post('/config/create', 
    verifyInputUpdateParameters(['key', 'description', 'group']), [
        check('group').isMongoId(), 
        check('key').isLength({ min: 3, max: 50 })
    ], validate, auth, async (req, res) => {
    try {
        const config = await Services.createConfig(req.body, req.admin);
        res.status(201).send(config);
    } catch (e) {
        responseException(res, e, 400, SwitcherKeys.ELEMENT_CREATION);
    }
});

// GET /config?group=ID&limit=10&skip=20
// GET /config?group=ID&sortBy=createdAt:desc
// GET /config?group=ID&fields=key,description
// GET /config?group=ID
router.get('/config', auth, [
    query('group').isMongoId(),
    query('fields').isString().optional(),
    query('limit').isInt().optional(),
    query('skip').isInt().optional(),
    query('sortBy').isString().optional()
], validate, async (req, res) => {
    try {
        const groupConfig = await getGroupConfigById(req.query.group);
        await groupConfig.populate({
            path: 'config',
            options: {
                limit: parseInt(req.query.limit || 10),
                skip: parseInt(req.query.skip || 0),
                sort: sortBy(req.query)
            }
        });

        let configs = groupConfig.config;
        configs = await verifyOwnership(req.admin, configs, groupConfig.domain, ActionTypes.READ, RouterTypes.CONFIG, true);
        await Services.populateAdmin(configs);

        if (req.query.fields) {
            configs = getFields(configs, req.query.fields);
        }
        
        res.send(configs);
    } catch (e) {
        responseException(res, e, 500);
    }
});

// GET /config/ID?resolveComponents=true
router.get('/config/:id', auth, [
    check('id').isMongoId()
], validate, async (req, res) => {
    try {
        let config = await Services.getConfigById(req.params.id, true);
        config = await verifyOwnership(req.admin, config, config.domain, ActionTypes.READ, RouterTypes.CONFIG, true);

        if (req.query.resolveComponents === 'true') {
            await config.populate({ path: 'component_list' });
        }

        res.send(config);
    } catch (e) {
        responseException(res, e, 500);
    }
});

// GET /config/ID?sortBy=date:desc
// GET /config/ID?limit=10&skip=20
// GET /config/ID
router.get('/config/history/:id', auth, [
    check('id').isMongoId()
], validate, async (req, res) => {
    try {
        const config = await Services.getConfigById(req.params.id);

        const query = 'oldValue newValue updatedBy date -_id';
        const history = await getHistory(query, config.domain, config._id, req.query);

        await verifyOwnership(req.admin, config, config.domain, ActionTypes.READ, RouterTypes.CONFIG, true);

        res.send(history);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.delete('/config/history/:id', auth, [
    check('id').isMongoId()
], validate, async (req, res) => {
    try {
        const config = await Services.getConfigById(req.params.id);
        await verifyOwnership(req.admin, config, config.domain, ActionTypes.DELETE, RouterTypes.ADMIN);

        await deleteHistory(config.domain, config._id);
        res.send(config);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.delete('/config/:id', auth, [
    check('id').isMongoId()
], validate, async (req, res) => {
    try {
        const config = await Services.deleteConfig(req.params.id, req.admin);
        res.send(config);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.patch('/config/:id', auth, [
    check('id').isMongoId(),
    check('key').optional().isLength({ min: 3, max: 50 }),
    check('group').optional().isMongoId(), 
], validate, verifyInputUpdateParameters([
    'key', 'description', 'group', 'relay', 'disable_metrics'
]), async (req, res) => {
    try {
        const config = await Services.updateConfig(req.params.id, req.body, req.admin);
        res.send(config);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.patch('/config/updateRelay/:id', auth, [
    check('id').isMongoId()
], validate, verifyInputUpdateParameters([
    'type', 'description', 'activated', 'endpoint', 'method', 'auth_prefix', 'auth_token'
]), async (req, res) => {
    try {
        let config = await Services.updateConfigRelay(req.params.id, req.body, req.admin);
        res.send(config);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.patch('/config/updateStatus/:id', auth, [
    check('id').isMongoId()
], validate, async (req, res) => {
    try {
        let config = await Services.updateConfigStatus(req.params.id, req.body, req.admin);
        res.send(config);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.patch('/config/removeStatus/:id', auth, [
    check('id').isMongoId()
], validate, async (req, res) => {
    try {
        const config = await Services.removeConfigStatusEnv(req.params.id, req.body.env, req.admin);
        res.send(config);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.patch('/config/addComponent/:id', auth, [
    check('id').isMongoId()
], validate, async (req, res) => {
    try {
        const config = await Services.addComponent(req.params.id, req.body, req.admin);
        res.send(config);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.patch('/config/removeComponent/:id', auth, [
    check('id').isMongoId()
], validate, async (req, res) => {
    try {
        const config = await Services.removeComponent(req.params.id, req.body, req.admin);
        res.send(config);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.patch('/config/updateComponents/:id', auth, [
    check('id').isMongoId(),
    body('components').isArray(),
    body('components.*').isMongoId()
], validate, async (req, res) => {
    try {
        const config = await Services.updateComponent(req.params.id, req.body, req.admin);
        res.send(config);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.patch('/config/removeRelay/:id/:env', auth, [
    check('id').isMongoId(),
    check('env').isLength({ min: 1 })
], validate, async (req, res) => {
    try {
        let config = await Services.removeRelay(req.params.id, req.params.env, req.admin);
        res.send(config);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.patch('/config/relay/verify/:id/:env', auth, [
    check('id').isMongoId(),
    check('env').isLength({ min: 1 })
], validate, async (req, res) => {
    try {
        const result = await Services.verifyRelay(req.params.id, req.params.env, req.admin);
        res.send({ status: result });
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.get('/config/spec/relay', auth, (_req, res) => {
    res.send(relayOptions());
});

export default router;