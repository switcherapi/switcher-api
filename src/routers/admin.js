const express = require('express')
const Admin = require('../models/admin')
const { auth } = require('../middleware/auth')
const { masterPermission } = require('../middleware/validators')
const router = new express.Router()

router.post('/admin/signup', async (req, res) => {
    const admin = new Admin(req.body)
    admin.master = true

    try {
        await admin.save()
        const token = await admin.generateAuthToken()
        res.status(201).send({ admin, token })
    } catch (e) {
        res.status(400).send(e)
    }
})

router.post('/admin/create', auth, masterPermission('create Admins'), async (req, res) => {
    const admin = new Admin(req.body)

    try {
        await admin.save()
        const token = await admin.generateAuthToken()
        res.status(201).send({ admin, token })
    } catch (e) {
        res.status(400).send(e)
    }
})

router.post('/admin/login', async (req, res) => {
    try {
        const admin = await Admin.findByCredentials(req.body.email, req.body.password)
        const token = await admin.generateAuthToken()
        res.send({ admin, token })
    } catch (e) {
        res.status(400).send()
    }
})

router.post('/admin/logout', auth, async (req, res) => {
    try {
        req.admin.tokens = req.admin.tokens.filter((token) => {
            return token.token !== req.token
        })

        await req.admin.save()
        res.send()
    } catch (e) {
        res.status(500).send()
    }
})

router.post('/admin/logoutAll', auth, async (req, res) => {
    try {
        req.admin.tokens = []
        await req.admin.save()
        res.send()
    } catch (e) {
        res.status(500).send()
    }
})

router.post('/admin/logoutOtherSessions', auth, async (req, res) => {
    try {
        req.admin.tokens = req.admin.tokens.filter((token) => {
            return token.token === req.token
        })

        await req.admin.save()
        res.send()
    } catch (e) {
        res.status(500).send()
    }
})

router.get('/admin/me', auth, async (req, res) => {
    res.send(req.admin)
})

router.delete('/admin/me', auth, async (req, res) => {
    try {
        await req.admin.remove()
        res.send(req.admin)
    } catch (e) {
        res.status(500).send()
    }
})

router.delete('/admin/:id', auth, masterPermission('delete Admins'), async (req, res) => {
    const admin = await Admin.findOne({ _id: req.params.id })

    if (!admin) {
        return res.status(404).send()
    }

    try {
        await admin.remove()
        res.send(admin)
    } catch (e) {
        res.status(500).send()
    }
})

router.patch('/admin/me', auth, async (req, res) => {
    const updates = Object.keys(req.body)
    const allowwedUpdates = ['name', 'email', 'password']
    const isValidOperation = updates.every((update) => allowwedUpdates.includes(update))

    if (!isValidOperation) {
        return res.status(400).send({ error: 'Invalid updates' })
    }

    try {
        updates.forEach((update) => req.admin[update] = req.body[update])
        await req.admin.save()
        res.send(req.admin)
    } catch (e) {
        res.status(400).send(e)
    }
})

router.patch('/admin/:id', auth, masterPermission('update Admins'), async (req, res) => {
    const updates = Object.keys(req.body)
    const allowwedUpdates = ['name', 'email', 'password', 'active', 'master']
    const isValidOperation = updates.every((update) => allowwedUpdates.includes(update))

    const admin = await Admin.findOne({ _id: req.params.id })

    if (!admin) {
        return res.status(404).send()
    }

    if (admin.id === req.admin.id) {
        return res.status(400).send({ message: 'Unable to modify your own params' })
    }

    if (!isValidOperation) {
        return res.status(400).send({ error: 'Invalid updates' })
    }

    try {
        updates.forEach((update) => admin[update] = req.body[update])
        await admin.save()
        res.send(admin)
    } catch (e) {
        res.status(400).send(e)
    }
})

module.exports = router