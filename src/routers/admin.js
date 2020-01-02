import express from 'express';
import Admin from '../models/admin';
import { auth, authRefreshToken } from '../middleware/auth';
import { verifyInputUpdateParameters } from '../middleware/validators';
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
    req.admin.token = null;
    await req.admin.save()
    res.send()
})

router.post('/admin/refresh/me', authRefreshToken, async (req, res) => {
    res.status(200).send(req.jwt)
})

router.get('/admin/me', auth, async (req, res) => {
    res.send(req.admin)
})

router.delete('/admin/me', auth, async (req, res) => {
    await req.admin.remove()
    res.send(req.admin)
})

router.patch('/admin/me', auth, verifyInputUpdateParameters(['name', 'email', 'password']), async (req, res) => {
    req.updates.forEach((update) => req.admin[update] = req.body[update])
    await req.admin.save()
    res.send(req.admin)
})

export default router;