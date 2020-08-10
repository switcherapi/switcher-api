import express from 'express';
import Admin from '../models/admin';
import { auth, authRefreshToken } from '../middleware/auth';
import { verifyInputUpdateParameters } from '../middleware/validators';
import { check, validationResult } from 'express-validator';
import { responseException, verifyOwnership } from './common';
import { getGitToken, getGitUserInfo } from '../external/oauth-git';
import { getBitBucketToken, getBitBucketUserInfo } from '../external/oauth-bitbucket';
import { validate_token } from '../external/google-recaptcha';

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

    try {
        await validate_token(req);
        const admin = new Admin(req.body);
        const jwt = await admin.generateAuthToken();

        await admin.save();
        res.status(201).send({ admin, jwt });
    } catch (e) {
        res.status(400).send({ error: e.message });
    }
})

router.post('/admin/github/auth', async (req, res) => {
    try {
        const token = await getGitToken(req.query.code);
        const userInfo = await getGitUserInfo(token);

        let admin = await Admin.findUserByGitId(userInfo.id);

        if (!admin) {
            admin = new Admin({
                name: userInfo.name,
                email: userInfo.email,
                _gitid: userInfo.id,
                _avatar: userInfo.avatar,
                password: Math.random().toString(36).slice(-8)
            })
            await admin.save();
        }
    
        const jwt = await admin.generateAuthToken();
        res.status(201).send({ admin, jwt });
    } catch (e) {
        res.status(401).send({ error: e.message });
    }
})

router.post('/admin/bitbucket/auth', async (req, res) => {
    try {
        const token = await getBitBucketToken(req.query.code);
        const userInfo = await getBitBucketUserInfo(token);

        let admin = await Admin.findUserByBitBucketId(userInfo.id);

        if (!admin) {
            admin = new Admin({
                name: userInfo.name,
                email: userInfo.email,
                _bitbucketid: userInfo.id,
                _avatar: userInfo.avatar,
                password: Math.random().toString(36).slice(-8)
            });
            await admin.save();
        }
    
        const jwt = await admin.generateAuthToken();
        res.status(201).send({ admin, jwt });
    } catch (e) {
        res.status(401).send({ error: e.message });
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
        const admin = await Admin.findByCredentials(req.body.email, req.body.password);
        const jwt = await admin.generateAuthToken();
        res.send({ admin, jwt });
    } catch (e) {
        res.status(401).send({ error: 'Invalid email/password' });
    }
})

router.post('/admin/logout', auth, async (req, res) => {
    req.admin.token = null;
    await req.admin.save();
    res.send();
})

router.post('/admin/refresh/me', authRefreshToken, async (req, res) => {
    res.status(200).send(req.jwt);
})

router.get('/admin/me', auth, async (req, res) => {
    await req.admin.populate({ path: 'team_list' }).execPopulate();
    res.send(req.admin);
})

router.post('/admin/collaboration/permission', auth, async (req, res) => {
    const element = {
        _id: req.body.element.id,
        name: req.body.element.name,
        key: req.body.element.key,
        strategy: req.body.element.strategy
    }

    let result = [];
    for (let index = 0; index < req.body.action.length; index++) {
        try {
            await verifyOwnership(req.admin, element, req.body.domain, req.body.action[index], req.body.router);
            result.push({
                action: req.body.action[index],
                result: 'ok'
            });
        } catch (e) {
            result.push({
                action : req.body.action[index],
                result: 'nok'
            });
        }
    }
    
    res.send(result);
})

router.get('/admin/collaboration', auth, async (req, res) => {
    await req.admin.populate({ path: 'team_list' }).execPopulate();
    const domains = req.admin.team_list.map(adm => adm.domain.toString());
    res.send(Array.from(new Set(domains)));
})

router.get('/admin/:id', auth, async (req, res) => {
    try {
        let admin = await Admin.findById(req.params.id);

        if (!admin) {
            return res.status(404).send();
        }
        
        res.send(admin);
    } catch (e) {
        responseException(res, e, 400);
    }
})

router.delete('/admin/me', auth, async (req, res) => {
    await req.admin.remove();
    res.send(req.admin);
})

router.patch('/admin/me', auth, verifyInputUpdateParameters(['name', 'email', 'password']), async (req, res) => {
    req.updates.forEach((update) => req.admin[update] = req.body[update]);
    await req.admin.save();
    res.send(req.admin);
})

export default router;