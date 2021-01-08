import express from 'express';
import { check } from 'express-validator';
import mongoose from 'mongoose';
import Component from '../models/component';
import { relayOptions } from '../models/config';
import History from '../models/history';
import { auth } from '../middleware/auth';
import { ActionTypes, RouterTypes } from '../models/role';
import { responseException } from '../exceptions';
import {
    validate,
    verifyInputUpdateParameters } from '../middleware/validators';
import { 
    removeConfigStatus, 
    verifyOwnership, 
    updateDomainVersion } from './common/index';
import { createConfig, deleteConfig, getConfigById, updateConfig, updateConfigRelay, updateConfigStatus } from '../controller/config';
import { getGroupConfigById } from '../controller/group';

const router = new express.Router();

async function verifyAddComponentInput(configId, admin) {
    const config = await getConfigById(configId);
    return await verifyOwnership(admin, config, config.domain, ActionTypes.UPDATE, RouterTypes.CONFIG);
}

router.post('/config/create', auth, async (req, res) => {
    try {
        const config = await createConfig(req.body, req.admin);
        res.status(201).send(config);
    } catch (e) {
        responseException(res, e, 400);
    }
});

// GET /config?group=ID&limit=10&skip=20
// GET /config?group=ID&sortBy=createdAt:desc
// GET /config?group=ID
router.get('/config', auth, async (req, res) => {
    const sort = {};

    if (req.query.sortBy) {
        const parts = req.query.sortBy.split(':');
        sort[parts[0]] = parts[1] === 'desc' ? -1 : 1;
    }

    try {
        const groupConfig = await getGroupConfigById(req.query.group);
        await groupConfig.populate({
            path: 'config',
            options: {
                limit: parseInt(req.query.limit),
                skip: parseInt(req.query.skip),
                sort
            }
        }).execPopulate();

        let configs = groupConfig.config;

        configs = await verifyOwnership(req.admin, configs, groupConfig.domain, ActionTypes.READ, RouterTypes.CONFIG, true);

        res.send(configs);
    } catch (e) {
        responseException(res, e, 500);
    }
});

// GET /config/ID?resolveComponents=true
router.get('/config/:id', [
    check('id').isMongoId()], validate, auth, async (req, res) => {
    try {
        let config = await getConfigById(req.params.id);
        config = await verifyOwnership(req.admin, config, config.domain, ActionTypes.READ, RouterTypes.CONFIG, true);

        if (req.query.resolveComponents) {
            await config.populate({ path: 'component_list' }).execPopulate();
        }

        res.send(config);
    } catch (e) {
        responseException(res, e, 500);
    }
});

// GET /config/ID?sortBy=date:desc
// GET /config/ID?limit=10&skip=20
// GET /config/ID
router.get('/config/history/:id', [
    check('id').isMongoId()], validate, auth, async (req, res) => {
    const sort = {};

    if (req.query.sortBy) {
        const parts = req.query.sortBy.split(':');
        sort[`${parts[0]}`] = parts[1] === 'desc' ? -1 : 1;
    }

    try {
        const config = await getConfigById(req.params.id);
        const history = await History.find({ domainId: config.domain, elementId: config._id })
            .select('oldValue newValue updatedBy date -_id')
            .sort(sort)
            .limit(parseInt(req.query.limit))
            .skip(parseInt(req.query.skip));

        await verifyOwnership(req.admin, config, config.domain, ActionTypes.READ, RouterTypes.CONFIG);

        res.send(history);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.delete('/config/history/:id', [
    check('id').isMongoId()], validate, auth, async (req, res) => {
    try {
        const config = await getConfigById(req.params.id);
        await verifyOwnership(req.admin, config, config.domain, ActionTypes.DELETE, RouterTypes.ADMIN);

        await History.deleteMany({ domainId: config.domain, elementId: config._id });
        res.send(config);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.delete('/config/:id', [
    check('id').isMongoId()], validate, auth, async (req, res) => {
    try {
        const config = await deleteConfig(req.params.id, req.admin);
        res.send(config);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.patch('/config/:id', [
    check('id').isMongoId()], validate, auth, verifyInputUpdateParameters([
    'key', 'description', 'relay', 'disable_metrics']), async (req, res) => {
    try {
        const config = await updateConfig(req.params.id, req.body, req.admin);
        res.send(config);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.patch('/config/updateRelay/:id', [
    check('id').isMongoId()], validate, auth, async (req, res) => {
    try {
        let config = await updateConfigRelay(req.params.id, req.body, req.admin);
        res.send(config);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.patch('/config/updateStatus/:id', [
    check('id').isMongoId()], validate,auth, async (req, res) => {
    try {
        let config = await updateConfigStatus(req.params.id, req.body, req.admin);
        res.send(config);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.patch('/config/removeStatus/:id', [
    check('id').isMongoId()], validate,auth, async (req, res) => {
    try {
        let config = await getConfigById(req.params.id);
        config = await verifyOwnership(req.admin, config, config.domain, ActionTypes.UPDATE, RouterTypes.CONFIG);
        config.updatedBy = req.admin.email;

        updateDomainVersion(config.domain);
        res.send(await removeConfigStatus(config, req.body.env));
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.patch('/config/addComponent/:id', [
    check('id').isMongoId()], validate,auth, async (req, res) => {
    try {
        const config = await verifyAddComponentInput(req.params.id, req.admin);
        const component = await Component.findById(req.body.component);

        if (!component) {
            return res.status(404).send({ error: 'Component not found' });
        }

        if (config.components.includes(component._id)) {
            return res.status(400).send({ error:  `Component ${component.name} already exists` });
        }

        config.updatedBy = req.admin.email;
        config.components.push(component._id);
        await config.save();
        updateDomainVersion(config.domain);
        res.send(config);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.patch('/config/removeComponent/:id', [
    check('id').isMongoId()], validate,auth, async (req, res) => {
    try {
        const config = await verifyAddComponentInput(req.params.id, req.admin);
        const component = await Component.findById(req.body.component);

        if (!component) {
            return res.status(404).send({ error: 'Component not found' });
        }

        config.updatedBy = req.admin.email;
        const indexComponent = config.components.indexOf(req.body.component);
        config.components.splice(indexComponent, 1);
        await config.save();
        updateDomainVersion(config.domain);
        res.send(config);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.patch('/config/updateComponents/:id', [
    check('id').isMongoId()], validate,auth, async (req, res) => {
    try {
        const config = await verifyAddComponentInput(req.params.id, req.admin);
        const componentIds = req.body.components.map(component => mongoose.Types.ObjectId(component));
        const components = await Component.find({ _id: { $in: componentIds } });

        if (components.length != req.body.components.length) {
            return res.status(404).send({ error: 'One or more component was not found' });
        }

        config.updatedBy = req.admin.email;
        config.components = componentIds;
        await config.save();
        updateDomainVersion(config.domain);
        res.send(config);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.patch('/config/removeRelay/:id/:env', [
    check('id').isMongoId(),
    check('env').isLength({ min: 1 })], validate,auth, async (req, res) => {
    try {
        let config = await getConfigById(req.params.id);
        config = await verifyOwnership(req.admin, config, config.domain, ActionTypes.DELETE, RouterTypes.CONFIG);
        config.updatedBy = req.admin.email;

        if (config.relay.activated && config.relay.activated.get(req.params.env) != undefined) {
            if (config.relay.activated.size > 1) {
                config.relay.activated.delete(req.params.env);
                config.relay.endpoint.delete(req.params.env);
                config.relay.auth_token.delete(req.params.env);
            } else {
                config.relay = {};
            }

            await config.save();
            updateDomainVersion(config.domain);
        }
 
        res.send(config);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.get('/config/spec/relay', auth, (req, res) => {
    res.send(relayOptions());
});

export default router;