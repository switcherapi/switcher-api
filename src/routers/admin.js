import express from 'express';
import Admin from '../models/admin';
import { auth, authRefresh } from '../middleware/auth';
import { masterPermission } from '../middleware/validators';
import { check, validationResult } from 'express-validator';

const router = new express.Router()

router.post('/admin/signup', [
    check('name').isLength({ min: 2 }),
    check('email').isEmail(),
    check('password').isLength({ min: 5 })
], async (req, res) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    }

    const admin = new Admin(req.body)
    admin.master = true

    try {
        const token = await admin.generateAuthToken()

        await admin.save()
        res.status(201).send({ admin, token })
    } catch (e) {
        res.status(400).send(e)
    }
})

router.post('/admin/create', [
    check('name').isLength({ min: 2 }),
    check('email').isEmail(),
    check('password').isLength({ min: 5 })
], auth, authRefresh(false), masterPermission('create Admins'), async (req, res) => {
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    }

    const admin = new Admin(req.body)

    try {
        const token = await admin.generateAuthToken()
        
        await admin.save()
        res.status(201).send({ admin, token })
    } catch (e) {
        res.status(400).send(e)
    }
})

router.post('/admin/login', [
    check('email').isEmail(),
    check('password').isLength({ min: 5 })
], async (req, res) => {
    try {
        const admin = await Admin.findByCredentials(req.body.email, req.body.password)
        const token = await admin.generateAuthToken()
        res.send({ admin, token })
    } catch (e) {
        res.status(400).send()
    }
})

router.post('/admin/logout', auth, authRefresh(false), async (req, res) => {
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

router.post('/admin/logoutAll', auth, authRefresh(false), async (req, res) => {
    try {
        req.admin.tokens = []
        await req.admin.save()
        res.send()
    } catch (e) {
        res.status(500).send()
    }
})

router.post('/admin/logoutOtherSessions', auth, authRefresh(false), async (req, res) => {
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

router.post('/admin/refresh/me', auth, authRefresh(), async (req, res) => {
    res.status(200).send()
})

router.get('/admin/me', auth, authRefresh(), async (req, res) => {
    res.send(req.admin)
})

router.delete('/admin/me', auth, authRefresh(), async (req, res) => {
    try {
        await req.admin.remove()
        res.send(req.admin)
    } catch (e) {
        res.status(500).send()
    }
})

router.delete('/admin/:id', auth, authRefresh(), masterPermission('delete Admins'), async (req, res) => {
    try {
        const admin = await Admin.findById(req.params.id)

        if (!admin) {
            return res.status(404).send()
        }

        await admin.remove()
        res.send(admin)
    } catch (e) {
        return res.status(500).send()
    }
})

router.patch('/admin/me', auth, authRefresh(false), async (req, res) => {
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

router.patch('/admin/:id', auth, authRefresh(false), masterPermission('update Admins'), async (req, res) => {
    const updates = Object.keys(req.body)
    const allowwedUpdates = ['name', 'email', 'password', 'active', 'master']
    const isValidOperation = updates.every((update) => allowwedUpdates.includes(update))

    try {
        const admin = await Admin.findOne({ _id: req.params.id })

        if (!admin) {
            return res.status(404).send()
        }

        if (admin.id === req.admin.id) {
            return res.status(400).send({ error: 'Unable to modify your own params' })
        }

        if (!isValidOperation) {
            return res.status(400).send({ error: 'Invalid updates' })
        }

        updates.forEach((update) => admin[update] = req.body[update])
        await admin.save()
        res.send(admin)
    } catch (e) {
        res.status(400).send(e)
    }
})

export default router;