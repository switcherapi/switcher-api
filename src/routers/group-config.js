const express = require('express')
const Domain = require('../models/domain')
const GroupConfig = require('../models/group-config')
const { auth } = require('../middleware/auth')
const router = new express.Router()

router.post('/groupconfig/create', auth, async (req, res) => {
    const groupconfig = new GroupConfig({
        ...req.body,
        owner: req.admin._id
    })
    
    const domain = await Domain.findById(req.body.domain).countDocuments()

    if (domain === 0) {
        return res.status(404).send({ message: 'Domain not found' })
    }

    try {
        await groupconfig.save()
        res.status(201).send(groupconfig)
    } catch (e) {
        res.status(400).send(e)
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
            message: 'Please, specify the \'domain\' id'
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
            return res.status(404).send({ message: 'Domain not found' })
        }

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
})

router.get('/groupconfig/:id', auth, async (req, res) => {
    try {
        const groupconfig = await GroupConfig.findOne({ _id: req.params.id })

        if (!groupconfig) {
            return res.status(404).send()
        }

        res.send(groupconfig)
    } catch (e) {
        res.status(404).send()
    }
})

router.delete('/groupconfig/:id', auth, async (req, res) => {
    try {
        const groupconfig = await GroupConfig.findOne({ _id: req.params.id })

        if (!groupconfig) {
            return res.status(404).send()
        }

        await groupconfig.remove()
        res.send(groupconfig)
    } catch (e) {
        res.status(500).send()
    }
})

router.patch('/groupconfig/:id', auth, async (req, res) => {
    const updates = Object.keys(req.body)
    const allowedUpdates = ['name', 'description', 'activated']
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update))

    if (!isValidOperation) {
        return res.status(400).send({ error: 'Invalid updates' })
    }

    try {
        const groupconfig = await GroupConfig.findOne({ _id: req.params.id })
 
        if (!groupconfig) {
            return res.status(404).send()
        }

        updates.forEach((update) => groupconfig[update] = req.body[update])
        await groupconfig.save()
        res.send(groupconfig)
    } catch (e) {
        res.status(400).send(e)
    }
})

module.exports = router