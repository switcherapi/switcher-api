import express from 'express';
import Admin from '../models/admin';
import { auth, authRefreshToken } from '../middleware/auth';
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
        const jwt = await admin.generateAuthToken()

        await admin.save()
        res.status(201).send({ admin, jwt })
    } catch (e) {
        res.status(400).send(e)
    }
})

router.post('/admin/create', [
    check('name').isLength({ min: 2 }),
    check('email').isEmail(),
    check('password').isLength({ min: 5 })
], auth, masterPermission('create Admins'), async (req, res) => {
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    }

    const admin = new Admin(req.body)

    try {
        const jwt = await admin.generateAuthToken()
        
        await admin.save()
        res.status(201).send({ admin, jwt })
    } catch (e) {
        res.status(400).send(e)
    }
})

router.post('/admin/login', [
    check('email').isEmail(),
    check('password').isLength({ min: 5 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    }

    try {
        const admin = await Admin.findByCredentials(req.body.email, req.body.password)
        const jwt = await admin.generateAuthToken()
        res.send({ admin, jwt })
    } catch (e) {
        res.status(401).send({ error: 'Invalid email/password' })
    }
})

router.post('/admin/logout', auth, async (req, res) => {
    try {
        req.admin.token = null;
        await req.admin.save()
        res.send()
    } catch (e) {
        res.status(500).send()
    }
})

router.post('/admin/refresh/me', authRefreshToken, async (req, res) => {
    res.status(200).send(req.jwt)
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