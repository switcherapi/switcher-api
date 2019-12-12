import express from 'express';
import Component from '../models/component';
import GroupConfig from '../models/group-config';
import Config from '../models/config';
import { auth } from '../middleware/auth';
import { masterPermission, checkEnvironmentStatusChange } from '../middleware/validators';
import { removeConfigStatus } from './common/index'

const router = new express.Router()

router.post('/config/create', auth, async (req, res) => {
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

// GET /config?group=ID&activated=false
// GET /config?group=ID&limit=10&skip=20
// GET /config?group=ID&sortBy=createdAt:desc
// GET /config?group=ID
router.get("/config", auth, async (req, res) => {
    const match = {}
    const sort = {}

    if (!req.query.group) {
        return res.status(500).send({
            error: 'Please, specify the \'group\' id'
        })
    }

    if (req.query.activated) {
        match.activated = req.query.activated === 'true'
    }

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
            match,
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
        res.status(404).send()
    }
})

router.delete('/config/:id', auth, async (req, res) => {
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

router.patch('/config/:id', auth, async (req, res) => {
    const updates = Object.keys(req.body)
    const allowedUpdates = ['key', 'description']
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update))

    if (!isValidOperation) {
        return res.status(400).send({ error: 'Invalid updates' })
    }

    try {
        const config = await Config.findOne({ _id: req.params.id })
 
        if (!config) {
            return res.status(404).send()
        }

        updates.forEach((update) => config[update] = req.body[update])
        await config.save()
        res.send(config)
    } catch (e) {
        res.status(400).send(e)
    }
})

router.patch('/config/updateStatus/:id', auth, masterPermission('update Domain Environment'), async (req, res) => {
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

router.patch('/config/removeStatus/:id', auth, masterPermission('update Domain Environment'), async (req, res) => {
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

        try {
            const component = await Component.findOne({ name: req.body.component })

            if (!component) {
                return res.status(404).send({ error: `Component ${req.body.component} not found` })
            }

            config.components.push(component.name)
            await config.save()
            res.send(config)
        } catch (e) {
            res.status(400).send({ error: e.message })
        }
    } catch (e) {
        res.status(404).send()
    }
})

router.patch('/config/removeComponent/:id', auth, async (req, res) => {
    try {
        const config = await Config.findOne({ _id: req.params.id })
            
        if (!config) {
            return res.status(404).send()
        }

        try {
            const component = await Component.findOne({ name: req.body.component })

            if (!component) {
                return res.status(404).send({ error: `Component ${req.body.component} not found` })
            }

            config.components = config.components.filter(element => element !== req.body.component)
            await config.save()
            res.send(config)
        } catch (e) {
            res.status(400).send({ error: e.message })
        }
    } catch (e) {
        res.status(404).send()
    }
})

export default router;