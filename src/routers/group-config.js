import express from 'express';
import Domain from '../models/domain';
import GroupConfig from '../models/group-config';
import { auth } from '../middleware/auth';
import { masterPermission, checkEnvironmentStatusChange, checkEnvironmentStatusRemoval } from '../middleware/validators';

const router = new express.Router()

router.post('/groupconfig/create', auth, async (req, res) => {
    const groupconfig = new GroupConfig({
        ...req.body,
        owner: req.admin._id
    })

    try {
        const domain = await Domain.findById(req.body.domain).countDocuments()

        if (domain === 0) {
            return res.status(404).send({ error: 'Domain not found' })
        }

        try {
            await groupconfig.save()
            res.status(201).send(groupconfig)
        } catch (e) {
            res.status(400).send(e)
        }
    } catch (e) {
        res.status(404).send({ error: 'Domain not found' })
    }
})

// GET /groupconfig?activated=false
// GET /groupconfig?limit=10&skip=20
// GET /groupconfig?sortBy=createdAt:desc
// GET /groupconfig?domain=ID
router.get("/groupconfig", auth, async (req, res) => {
    const match = {}
    const sort = {}

    if (!req.query.domain) {
        return res.status(500).send({
            error: 'Please, specify the \'domain\' id'
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
        const domain = await Domain.findById(req.query.domain)

        if (!domain) {
            return res.status(404).send({ error: 'Domain not found' })
        }

        try {
            await domain.populate({
                path: 'groupConfig',
                match,
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
    } catch (e) {
        res.status(404).send({ error: 'Domain not found' })
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
        res.status(404).send({ error: 'Group not found' })
    }
})

router.delete('/groupconfig/:id', auth, async (req, res) => {
    try {
        const groupconfig = await GroupConfig.findOne({ _id: req.params.id })

        if (!groupconfig) {
            return res.status(404).send({ error: 'Group not found' })
        }

        try {
            await groupconfig.remove()
            res.send(groupconfig)
        } catch (e) {
            res.status(500).send()
        }
    } catch (e) {
        res.status(404).send({ error: 'Group not found' })
    }
})

router.patch('/groupconfig/:id', auth, async (req, res) => {
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

        try {
            updates.forEach((update) => groupconfig[update] = req.body[update])
            await groupconfig.save()
            res.send(groupconfig)
        } catch (e) {
            res.status(400).send(e)
        }
    } catch (e) {
        res.status(404).send({ error: 'Group not found' })
    }
})

router.patch('/groupconfig/updateStatus/:id', auth, masterPermission('update Domain Environment'), async (req, res) => {
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
        res.status(400).send({ error: e.message })
    }
})

router.patch('/groupconfig/removeStatus/:id', auth, masterPermission('update Domain Environment'), async (req, res) => {
    try {
        const groupconfig = await GroupConfig.findOne({ _id: req.params.id })
        
        if (!groupconfig) {
            return res.status(404).send()
        }

        await checkEnvironmentStatusRemoval(req, res, groupconfig.domain)

        groupconfig.activated.delete(req.body.env)
        await groupconfig.save()
        res.send(groupconfig)
    } catch (e) {
        res.status(400).send({ error: e.message })
    }
})

export default router;