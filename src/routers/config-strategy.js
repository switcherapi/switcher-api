const express = require('express')
const Config = require('../models/config')
const ConfigStrategy = require('../models/config-strategy')
const { auth } = require('../middleware/auth')
const router = new express.Router()

router.post('/configstrategy/create', auth, async (req, res) => {
    const configStrategy = new ConfigStrategy({
        ...req.body,
        owner: req.admin._id
    })

    const config = await Config.findById(req.body.config).countDocuments()

    if (config === 0) {
        return res.status(404).send({ message: 'Config not found' })
    }

    try {
        await configStrategy.save()
        res.status(201).send(configStrategy)
    } catch (e) {
        res.status(400).send(e)
    }
})

// GET /config?activated=false
// GET /config?limit=10&skip=20
// GET /config?sortBy=createdAt:desc
// GET /configstrategy?config=ID
router.get("/configstrategy", auth, async (req, res) => {
    const match = {}
    const sort = {}

    if (!req.query.config) {
        return res.status(500).send({
            message: 'Please, specify the \'config\' id'
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
        const config = await Config.findById(req.query.config)

        if (!config) {
            return res.status(404).send() 
        }

        await config.populate({
            path: 'configStrategy',
            match,
            options: {
                limit: parseInt(req.query.limit),
                skip: parseInt(req.query.skip),
                sort
            }
        }).execPopulate()
        res.send(config.configStrategy)
    } catch (e) {
        res.status(500).send()
    }
})

router.get('/configstrategy/:id', auth, async (req, res) => {
    try {
        const configStrategy = await ConfigStrategy.findOne({ _id: req.params.id })

        if (!configStrategy) {
            return res.status(404).send()
        }

        res.send(configStrategy)
    } catch (e) {
        res.status(404).send()
    }
})

router.delete('/configstrategy/:id', auth, async (req, res) => {
    try {
        const configStrategy = await ConfigStrategy.findOne({ _id: req.params.id })

        if (!configStrategy) {
            return res.status(404).send()
        }

        await configStrategy.remove()
        res.send(configStrategy)
    } catch (e) {
        res.status(500).send()
    }
})

router.patch('/configstrategy/:id', auth, async (req, res) => {
    const updates = Object.keys(req.body)
    const allowedUpdates = ['description', 'activated', 'strategy']
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update))

    if (!isValidOperation) {
        return res.status(400).send({ error: 'Invalid updates' })
    }

    try {
        const configStrategy = await ConfigStrategy.findOne({ _id: req.params.id })
        
        if (!configStrategy) {
            return res.status(404).send()
        }

        updates.forEach((update) => configStrategy[update] = req.body[update])
        await configStrategy.save()
        res.send(configStrategy)
    } catch (e) {
        res.status(400).send(e)
    }
})

module.exports = router