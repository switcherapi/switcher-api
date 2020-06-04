import express from 'express';
import mongoose from 'mongoose';
import Component from '../models/component';
import GroupConfig from '../models/group-config';
import Config from '../models/config';
import History from '../models/history';
import { auth } from '../middleware/auth';
import { checkEnvironmentStatusChange, verifyInputUpdateParameters } from '../middleware/validators';
import { removeConfigStatus, verifyOwnership, updateDomainVersion, responseException, NotFoundError } from './common/index'
import { ActionTypes, RouterTypes } from '../models/role';

const router = new express.Router()

async function verifyAddComponentInput(configId, admin) {
    const config = await Config.findById(configId)
            
    if (!config) {
        throw new NotFoundError('Config not found')
    }

    return await verifyOwnership(admin, config, config.domain, ActionTypes.UPDATE, RouterTypes.CONFIG)
}

router.post('/config/create', auth, async (req, res) => {
    try {
        const group = await GroupConfig.findById(req.body.group);

        if (!group) {
            return res.status(404).send({ error: 'Group Config not found' });
        }

        let config = await Config.findOne({ key: req.body.key, group: group._id, domain: group.domain });

        if (config) {
            return res.status(400).send({ error: `Config ${config.key} already exist` });
        }
    
        config = new Config({
            ...req.body,
            domain: group.domain,
            owner: req.admin._id
        });

        config = await verifyOwnership(req.admin, config, group.domain, ActionTypes.CREATE, RouterTypes.CONFIG);

        await config.save();
        updateDomainVersion(config.domain);
        res.status(201).send(config);
    } catch (e) {
        responseException(res, e, 400);
    }
})

// GET /config?group=ID&limit=10&skip=20
// GET /config?group=ID&sortBy=createdAt:desc
// GET /config?group=ID
router.get('/config', auth, async (req, res) => {
    const sort = {}

    if (req.query.sortBy) {
        const parts = req.query.sortBy.split(':')
        sort[parts[0]] = parts[1] === 'desc' ? -1 : 1
    }

    try {
        const groupConfig = await GroupConfig.findById(req.query.group)

        if (!groupConfig) {
            return res.status(404).send() 
        }

        await groupConfig.populate({
            path: 'config',
            options: {
                limit: parseInt(req.query.limit),
                skip: parseInt(req.query.skip),
                sort
            }
        }).execPopulate()

        let configs = groupConfig.config

        configs = await verifyOwnership(req.admin, configs, groupConfig.domain, ActionTypes.READ, RouterTypes.CONFIG, true)

        res.send(configs)
    } catch (e) {
        responseException(res, e, 500)
    }
})

// GET /config/ID?resolveComponents=true
router.get('/config/:id', auth, async (req, res) => {
    try {
        let config = await Config.findById(req.params.id)

        if (!config) {
            return res.status(404).send()
        }

        config = await verifyOwnership(req.admin, config, config.domain, ActionTypes.READ, RouterTypes.CONFIG, true)

        if (req.query.resolveComponents) {
            await config.populate({ path: 'component_list' }).execPopulate()
        }

        res.send(config)
    } catch (e) {
        responseException(res, e, 500)
    }
})

// GET /config/ID?sortBy=date:desc
// GET /config/ID?limit=10&skip=20
// GET /config/ID
router.get('/config/history/:id', auth, async (req, res) => {
    const sort = {}

    if (req.query.sortBy) {
        const parts = req.query.sortBy.split(':')
        sort[`${parts[0]}`] = parts[1] === 'desc' ? -1 : 1
    }

    try {
        const config = await Config.findById(req.params.id)

        if (!config) {
            return res.status(404).send()
        }

        await config.populate({
            path: 'history',
            select: 'oldValue newValue updatedBy date -_id',
            options: {
                limit: parseInt(req.query.limit),
                skip: parseInt(req.query.skip),
                sort
            }
        }).execPopulate()

        const history = config.history;

        await verifyOwnership(req.admin, config, config.domain, ActionTypes.READ, RouterTypes.CONFIG)

        res.send(history)
    } catch (e) {
        responseException(res, e, 500)
    }
})

router.delete('/config/history/:id', auth, async (req, res) => {
    try {
        const config = await Config.findById(req.params.id)

        if (!config) {
            return res.status(404).send()
        }

        await verifyOwnership(req.admin, config, config.domain, ActionTypes.DELETE, RouterTypes.ADMIN)

        await History.deleteMany({ elementId: config._id })
        res.send(config)
    } catch (e) {
        responseException(res, e, 500)
    }
})

router.delete('/config/:id', auth, async (req, res) => {
    try {
        let config = await Config.findById(req.params.id)

        if (!config) {
            return res.status(404).send()
        }

        config = await verifyOwnership(req.admin, config, config.domain, ActionTypes.DELETE, RouterTypes.CONFIG)

        await config.remove()
        updateDomainVersion(config.domain)
        res.send(config)
    } catch (e) {
        responseException(res, e, 500)
    }
})

router.patch('/config/:id', auth,
    verifyInputUpdateParameters(['key', 'description']), async (req, res) => {
    try {
        let config = await Config.findById(req.params.id);
 
        if (!config) {
            return res.status(404).send();
        }

        if (req.body.key) {
            const configFound = await Config.findOne({ key: req.body.key, group: config.group, domain: config.domain });
    
            if (configFound) {
                return res.status(400).send({ error: `Config ${req.body.key} already exist` });
            }
        }

        config = await verifyOwnership(req.admin, config, config.domain, ActionTypes.UPDATE, RouterTypes.CONFIG);
        config.updatedBy = req.admin.email;

        req.updates.forEach((update) => config[update] = req.body[update]);
        await config.save();
        updateDomainVersion(config.domain);
        res.send(config);
    } catch (e) {
        responseException(res, e, 500);
    }
})

router.patch('/config/updateStatus/:id', auth, async (req, res) => {
    try {
        let config = await Config.findById(req.params.id)
        
        if (!config) {
            return res.status(404).send({ error: 'Config does not exist'})
        }

        config = await verifyOwnership(req.admin, config, config.domain, ActionTypes.UPDATE, RouterTypes.CONFIG)
        config.updatedBy = req.admin.email

        const updates = await checkEnvironmentStatusChange(req, res, config.domain)
        
        updates.forEach((update) => config.activated.set(update, req.body[update]))
        await config.save()
        updateDomainVersion(config.domain)
        res.send(config)
    } catch (e) {
        responseException(res, e, 400)
    }
})

router.patch('/config/removeStatus/:id', auth, async (req, res) => {
    try {
        let config = await Config.findById(req.params.id)

        if (!config) {
            return res.status(404).send({ error: 'Config does not exist'})
        }

        config = await verifyOwnership(req.admin, config, config.domain, ActionTypes.UPDATE, RouterTypes.CONFIG)
        config.updatedBy = req.admin.email

        updateDomainVersion(config.domain)
        res.send(await removeConfigStatus(config, req.body.env))
    } catch (e) {
        responseException(res, e, 400)
    }
})

router.patch('/config/addComponent/:id', auth, async (req, res) => {
    try {
        const config = await verifyAddComponentInput(req.params.id, req.admin)
        const component = await Component.findById(req.body.component)

        if (!component) {
            return res.status(404).send({ error: `Component not found` })
        }

        if (config.components.includes(component._id)) {
            return res.status(400).send({ error:  `Component ${component.name} already exists` })
        }

        config.updatedBy = req.admin.email
        config.components.push(component._id)
        await config.save()
        updateDomainVersion(config.domain)
        res.send(config)
    } catch (e) {
        responseException(res, e, 500)
    }
})

router.patch('/config/removeComponent/:id', auth, async (req, res) => {
    try {
        const config = await verifyAddComponentInput(req.params.id, req.admin)
        const component = await Component.findById(req.body.component)

        if (!component) {
            return res.status(404).send({ error: `Component not found` })
        }

        config.updatedBy = req.admin.email
        const indexComponent = config.components.indexOf(req.body.component)
        config.components.splice(indexComponent, 1)
        await config.save()
        updateDomainVersion(config.domain)
        res.send(config)
    } catch (e) {
        responseException(res, e, 500)
    }
})

router.patch('/config/updateComponents/:id', auth, async (req, res) => {
    try {
        const config = await verifyAddComponentInput(req.params.id, req.admin)
        const componentIds = req.body.components.map(component => mongoose.Types.ObjectId(component))
        const components = await Component.find({ _id: { $in: componentIds } })

        if (components.length != req.body.components.length) {
            return res.status(404).send({ error: `One or more component was not found` })
        }

        config.updatedBy = req.admin.email
        config.components = componentIds
        await config.save()
        updateDomainVersion(config.domain)
        res.send(config)
    } catch (e) {
        responseException(res, e, 400)
    }
})

export default router;