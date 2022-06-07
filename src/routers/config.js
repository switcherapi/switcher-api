import express from 'express';
import { check } from 'express-validator';
import { relayOptions } from '../models/config';
import History from '../models/history';
import { auth } from '../middleware/auth';
import { ActionTypes, RouterTypes } from '../models/role';
import { responseException } from '../exceptions';
import {
    validate,
    verifyInputUpdateParameters } from '../middleware/validators';
import { sortBy, verifyOwnership } from '../helpers';
import * as Controller from '../controller/config';
import { getGroupConfigById } from '../controller/group-config';
import { SwitcherKeys } from '../external/switcher-api-facade';

const router = new express.Router();

router.post('/config/create', 
    verifyInputUpdateParameters(['key', 'description', 'group']), [
        check('group').isMongoId(), 
        check('key').isLength({ min: 3, max: 50 })
    ], validate, auth, async (req, res) => {
    try {
        const config = await Controller.createConfig(req.body, req.admin);
        res.status(201).send(config);
    } catch (e) {
        responseException(res, e, 400, SwitcherKeys.ELEMENT_CREATION);
    }
});

// GET /config?group=ID&limit=10&skip=20
// GET /config?group=ID&sortBy=createdAt:desc
// GET /config?group=ID
router.get('/config', auth, async (req, res) => {
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
        let config = await Controller.getConfigById(req.params.id);
        config = await verifyOwnership(req.admin, config, config.domain, ActionTypes.READ, RouterTypes.CONFIG, true);

        if (req.query.resolveComponents) {
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
        const config = await Controller.getConfigById(req.params.id);
        const history = await History.find({ domainId: config.domain, elementId: config._id })
            .select('oldValue newValue updatedBy date -_id')
            .sort(sortBy(req.query))
            .limit(parseInt(req.query.limit || 10))
            .skip(parseInt(req.query.skip || 0));

        await verifyOwnership(req.admin, config, config.domain, ActionTypes.READ, RouterTypes.CONFIG);

        res.send(history);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.delete('/config/history/:id', auth, [
    check('id').isMongoId()
], validate, async (req, res) => {
    try {
        const config = await Controller.getConfigById(req.params.id);
        await verifyOwnership(req.admin, config, config.domain, ActionTypes.DELETE, RouterTypes.ADMIN);

        await History.deleteMany({ domainId: config.domain, elementId: config._id });
        res.send(config);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.delete('/config/:id', auth, [
    check('id').isMongoId()
], validate, async (req, res) => {
    try {
        const config = await Controller.deleteConfig(req.params.id, req.admin);
        res.send(config);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.patch('/config/:id', auth, [
    check('id').isMongoId()
], validate, verifyInputUpdateParameters([
    'key', 'description', 'relay', 'disable_metrics'
]), async (req, res) => {
    try {
        const config = await Controller.updateConfig(req.params.id, req.body, req.admin);
        res.send(config);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.patch('/config/updateRelay/:id', auth, [
    check('id').isMongoId()
], validate, async (req, res) => {
    try {
        let config = await Controller.updateConfigRelay(req.params.id, req.body, req.admin);
        res.send(config);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.patch('/config/updateStatus/:id', auth, [
    check('id').isMongoId()
], validate, async (req, res) => {
    try {
        let config = await Controller.updateConfigStatus(req.params.id, req.body, req.admin);
        res.send(config);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.patch('/config/removeStatus/:id', auth, [
    check('id').isMongoId()
], validate, async (req, res) => {
    try {
        const config = await Controller.removeConfigStatusEnv(req.params.id, req.body.env, req.admin);
        res.send(config);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.patch('/config/addComponent/:id', auth, [
    check('id').isMongoId()
], validate, async (req, res) => {
    try {
        const config = await Controller.addComponent(req.params.id, req.body, req.admin);
        res.send(config);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.patch('/config/removeComponent/:id', auth, [
    check('id').isMongoId()
], validate, async (req, res) => {
    try {
        const config = await Controller.removeComponent(req.params.id, req.body, req.admin);
        res.send(config);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.patch('/config/updateComponents/:id', auth, [
    check('id').isMongoId()
], validate, async (req, res) => {
    try {
        const config = await Controller.updateComponent(req.params.id, req.body, req.admin);
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
        let config = await Controller.removeRelay(req.params.id, req.params.env, req.admin);
        res.send(config);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.get('/config/spec/relay', auth, (_req, res) => {
    res.send(relayOptions());
});

export default router;