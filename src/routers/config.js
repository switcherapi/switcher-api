const express = require('express')
const GroupConfig = require('../models/group-config')
const Config = require('../models/config')
const { auth } = require('../middleware/auth')
const router = new express.Router()

router.post('/config/create', auth, async (req, res) => {
    const config = new Config({
        ...req.body,
        owner: req.admin._id
    })

    const group = await GroupConfig.findById(req.body.group).countDocuments()
    
    if (group === 0) {
        return res.status(404).send({ message: 'Group Config not found' })
    }

    try {
        await config.save()
        res.status(201).send(config)
    } catch (e) {
        res.status(400).send(e)
    }
})

// GET /config?activated=false
// GET /config?limit=10&skip=20
// GET /config?sortBy=createdAt:desc
// GET /config?group=ID
router.get("/config", auth, async (req, res) => {
    const match = {}
    const sort = {}

    if (!req.query.group) {
        return res.status(500).send({
            message: 'Please, specify the \'group\' id'
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
    const allowedUpdates = ['key', 'description', 'activated']
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

module.exports = router