import express from 'express';
import Component from '../models/component';
import GroupConfig from '../models/group-config';
import Config from '../models/config';
import { auth } from '../middleware/auth';
import { masterPermission, checkEnvironmentStatusChange, verifyInputUpdateParameters } from '../middleware/validators';
import { removeConfigStatus } from './common/index'

const router = new express.Router()

router.post('/config/create', auth, masterPermission('create Config'), async (req, res) => {
    try {
        const group = await GroupConfig.findById(req.body.group)

        if (!group) {
            return res.status(404).send({ error: 'Group Config not found' })
        }
    
        const config = new Config({
            ...req.body,
            domain: group.domain,
            owner: req.admin._id
        })

        await config.save()
        res.status(201).send(config)
    } catch (e) {
        res.status(400).send(e)
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

        res.send(groupConfig.config)
    } catch (e) {
        res.status(500).send()
    }
})

router.get('/config/:id', auth, async (req, res) => {
    try {
        const config = await Config.findOne({ _id: req.params.id })

        if (!config) {
            return res.status(404).send()
        }

        res.send(config)
    } catch (e) {
        res.status(500).send()
    }
})

// GET /config/ID?sortBy=createdAt:desc
// GET /config/ID?limit=10&skip=20
// GET /config/ID
router.get('/config/history/:id', auth, async (req, res) => {
    const sort = {}

    if (req.query.sortBy) {
        const parts = req.query.sortBy.split(':')
        sort[`${parts[0]}.${parts[1]}`] = parts[2] === 'desc' ? -1 : 1
    }

    try {
        const config = await Config.findOne({ _id: req.params.id })

        if (!config) {
            return res.status(404).send()
        }

        await config.populate({
            path: 'history',
            select: 'oldValue newValue -_id',
            options: {
                limit: parseInt(req.query.limit),
                skip: parseInt(req.query.skip),
                sort
            }
        }).execPopulate()

        res.send(config.history)
    } catch (e) {
        res.status(500).send()
    }
})

router.delete('/config/:id', auth, masterPermission('delete Config'), async (req, res) => {
    try {
        const config = await Config.findOne({ _id: req.params.id })

        if (!config) {
            return res.status(404).send()
        }

        await config.remove()
        res.send(config)
    } catch (e) {
        res.status(500).send()
    }
})

router.patch('/config/:id', auth, masterPermission('update Config'), 
    verifyInputUpdateParameters(['key', 'description']), async (req, res) => {
    try {
        const config = await Config.findOne({ _id: req.params.id })
 
        if (!config) {
            return res.status(404).send()
        }

        req.updates.forEach((update) => config[update] = req.body[update])
        await config.save()
        res.send(config)
    } catch (e) {
        res.status(500).send(e)
    }
})

router.patch('/config/updateStatus/:id', auth, masterPermission('update Config Environment'), async (req, res) => {
    try {
        const config = await Config.findOne({ _id: req.params.id })
        
        if (!config) {
            return res.status(404).send()
        }

        const updates = await checkEnvironmentStatusChange(req, res, config.domain)
        
        updates.forEach((update) => config.activated.set(update, req.body[update]))
        await config.save()
        res.send(config)
    } catch (e) {
        res.status(400).send({ error: e.message })
    }
})

router.patch('/config/removeStatus/:id', auth, masterPermission('update Config Environment'), async (req, res) => {
    try {
        res.send(await removeConfigStatus(req.params.id, req.body.env))
    } catch (e) {
        res.status(400).send({ error: e.message })
    }
})

router.patch('/config/addComponent/:id', auth, async (req, res) => {
    try {
        const config = await Config.findOne({ _id: req.params.id })
            
        if (!config) {
            return res.status(404).send()
        }

        const component = await Component.findOne({ name: req.body.component })

        if (!component) {
            return res.status(404).send({ error: `Component ${req.body.component} not found` })
        }

        config.components.push(component.name)
        await config.save()
        res.send(config)
    } catch (e) {
        res.status(500).send()
    }
})

router.patch('/config/removeComponent/:id', auth, masterPermission('remove Component'), async (req, res) => {
    try {
        const config = await Config.findOne({ _id: req.params.id })
            
        if (!config) {
            return res.status(404).send()
        }

        const component = await Component.findOne({ name: req.body.component })

        if (!component) {
            return res.status(404).send({ error: `Component ${req.body.component} not found` })
        }

        config.components = config.components.filter(element => element !== req.body.component)
        await config.save()
        res.send(config)
    } catch (e) {
        res.status(500).send()
    }
})

export default router;