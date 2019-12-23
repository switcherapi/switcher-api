import express from 'express';
import Domain from '../models/domain';
import GroupConfig from '../models/group-config';
import { auth } from '../middleware/auth';
import { masterPermission, checkEnvironmentStatusChange } from '../middleware/validators';
import { removeGroupStatus } from './common/index'

const router = new express.Router()

router.post('/groupconfig/create', auth, masterPermission('create Group'), async (req, res) => {
    const groupconfig = new GroupConfig({
        ...req.body,
        owner: req.admin._id
    })

    try {
        const domain = await Domain.findById(req.body.domain)

        if (!domain) {
            return res.status(404).send({ error: 'Domain not found' })
        }

        await groupconfig.save()
        res.status(201).send(groupconfig)
    } catch (e) {
        res.status(500).send(e)
    }
})

// GET /groupconfig?limit=10&skip=20
// GET /groupconfig?sortBy=createdAt:desc
// GET /groupconfig?domain=ID
router.get('/groupconfig', auth, async (req, res) => {
    const sort = {}

    if (req.query.sortBy) {
        const parts = req.query.sortBy.split(':')
        sort[parts[0]] = parts[1] === 'desc' ? -1 : 1
    }

    try {
        const domain = await Domain.findById(req.query.domain)

        if (!domain) {
            return res.status(404).send({ error: 'Domain not found' })
        }

        await domain.populate({
            path: 'groupConfig',
            options: {
                limit: parseInt(req.query.limit),
                skip: parseInt(req.query.skip),
                sort
            }
        }).execPopulate()

        res.send(domain.groupConfig)
    } catch (e) {
        res.status(500).send()
    }
})

router.get('/groupconfig/:id', auth, async (req, res) => {
    try {
        const groupconfig = await GroupConfig.findOne({ _id: req.params.id })

        if (!groupconfig) {
            return res.status(404).send({ error: 'Group not found' })
        }

        res.send(groupconfig)
    } catch (e) {
        res.status(500).send()
    }
})

// GET /groupconfig/ID?sortBy=createdAt:desc
// GET /groupconfig/ID?limit=10&skip=20
// GET /groupconfig/ID
router.get('/groupconfig/history/:id', auth, async (req, res) => {
    const sort = {}

    if (req.query.sortBy) {
        const parts = req.query.sortBy.split(':')
        sort[`${parts[0]}.${parts[1]}`] = parts[2] === 'desc' ? -1 : 1
    }

    try {
        const groupconfig = await GroupConfig.findOne({ _id: req.params.id })

        if (!groupconfig) {
            return res.status(404).send()
        }

        await groupconfig.populate({
            path: 'history',
            select: 'oldValue newValue -_id',
            options: {
                limit: parseInt(req.query.limit),
                skip: parseInt(req.query.skip),
                sort
            }
        }).execPopulate()

        res.send(groupconfig.history)
    } catch (e) {
        res.status(500).send()
    }
})

router.delete('/groupconfig/:id', auth, masterPermission('delete Group'), async (req, res) => {
    try {
        const groupconfig = await GroupConfig.findOne({ _id: req.params.id })

        if (!groupconfig) {
            return res.status(404).send({ error: 'Group not found' })
        }

        await groupconfig.remove()
        res.send(groupconfig)
    } catch (e) {
        res.status(500).send()
    }
})

router.patch('/groupconfig/:id', auth, masterPermission('update Group'), async (req, res) => {
    const updates = Object.keys(req.body)
    const allowedUpdates = ['name', 'description']
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update))

    if (!isValidOperation) {
        return res.status(400).send({ error: 'Invalid updates' })
    }

    try {
        const groupconfig = await GroupConfig.findOne({ _id: req.params.id })
    
        if (!groupconfig) {
            return res.status(404).send({ error: 'Group not found' })
        }

        updates.forEach((update) => groupconfig[update] = req.body[update])
        await groupconfig.save()
        res.send(groupconfig)
    } catch (e) {
        res.status(500).send()
    }
})

router.patch('/groupconfig/updateStatus/:id', auth, masterPermission('update Group Environment'), async (req, res) => {
    try {
        const groupconfig = await GroupConfig.findOne({ _id: req.params.id })
        
        if (!groupconfig) {
            return res.status(404).send()
        }

        const updates = await checkEnvironmentStatusChange(req, res, groupconfig.domain)
        
        updates.forEach((update) => groupconfig.activated.set(update, req.body[update]))
        await groupconfig.save()
        res.send(groupconfig)
    } catch (e) {
        res.status(500).send()
    }
})

router.patch('/groupconfig/removeStatus/:id', auth, masterPermission('update Group Environment'), async (req, res) => {
    try {
        res.send(await removeGroupStatus(req.params.id, req.body.env))
    } catch (e) {
        res.status(400).send({ error: e.message })
    }
})

export default router;