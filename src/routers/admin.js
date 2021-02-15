import express from 'express';
import { auth, authRefreshToken } from '../middleware/auth';
import { validate, verifyInputUpdateParameters } from '../middleware/validators';
import { check } from 'express-validator';
import { verifyOwnership } from './common';
import { responseException } from '../exceptions';
import * as Controller from '../controller/admin';

const router = new express.Router();

router.post('/admin/signup', [
    check('name').isLength({ min: 2 }),
    check('email').isEmail(),
    check('password').isLength({ min: 5 })
], validate, async (req, res) => {
    try {
        const admin = await Controller.signUp(
            req.body, req.connection.remoteAddress);

        res.status(201).send({ admin });
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.post('/admin/signup/authorization', async (req, res) => {
    try {
        const { admin, jwt } = await Controller.signUpAuth(req.query.code);
        res.status(201).send({ admin, jwt });
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.post('/admin/github/auth', async (req, res) => {
    try {
        const { admin, jwt } = await Controller.signUpGitHub(req.query.code);
        res.status(201).send({ admin, jwt });
    } catch (e) {
        res.status(401).send({ error: e.message });
    }
});

router.post('/admin/bitbucket/auth', async (req, res) => {
    try {
        const { admin, jwt } = await Controller.signUpBitbucket(req.query.code);
        res.status(201).send({ admin, jwt });
    } catch (e) {
        res.status(401).send({ error: e.message });
    }
});

router.post('/admin/login', [
    check('email').isEmail(),
    check('password').isLength({ min: 5 })
], validate, async (req, res) => {
    try {
        const { admin, jwt } = await Controller.signIn(
            req.body.email, req.body.password);

        res.send({ admin, jwt });
    } catch (e) {
        res.status(401).send({ error: 'Invalid email/password' });
    }
});

router.post('/admin/login/request/recovery', 
    check('email').isEmail(), validate, async (req, res) => {
    await Controller.loginRequestRecovery(req.body.email);
    res.status(200).send({ message: 'Request received' });
});

router.post('/admin/login/recovery', async (req, res) => {
    try {
        const { admin, jwt } = await Controller.loginRecovery(
            req.body, req.connection.remoteAddress);

        res.status(200).send({ admin, jwt });
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.post('/admin/logout', auth, async (req, res) => {
    await Controller.logout(req.admin);
    res.send();
});

router.post('/admin/refresh/me', authRefreshToken, async (req, res) => {
    res.status(200).send(req.jwt);
});

router.get('/admin/me', auth, async (req, res) => {
    await req.admin.populate({ path: 'team_list' }).execPopulate();
    res.send(req.admin);
});

router.post('/admin/collaboration/permission', auth, async (req, res) => {
    const element = {
        _id: req.body.element.id,
        name: req.body.element.name,
        key: req.body.element.key,
        strategy: req.body.element.strategy
    };

    let result = [];
    for (const action_perm of req.body.action) {
        try {
            await verifyOwnership(req.admin, element, req.body.domain, action_perm, req.body.router);
            result.push({ action: action_perm, result: 'ok' });
        } catch (e) {
            result.push({ action : action_perm, result: 'nok' });
        }
    }
    
    res.send(result);
});

router.get('/admin/collaboration', auth, async (req, res) => {
    await req.admin.populate({ path: 'team_list' }).execPopulate();
    const domains = req.admin.team_list.map(adm => adm.domain.toString());
    res.send(Array.from(new Set(domains)));
});

router.get('/admin/:id', auth, async (req, res) => {
    try {
        const admin = await Controller.getAdminById(req.params.id);
        res.send(admin);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.delete('/admin/me', auth, async (req, res) => {
    try {
        const admin = await Controller.deleteAccount(req.admin);
        res.send(admin);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.patch('/admin/me', verifyInputUpdateParameters(['name', 'email', 'password']), 
    auth, async (req, res) => {
    const admin = await Controller.updateAccount(req.body, req.admin);
    res.send(admin);
});

router.patch('/admin/me/team/leave/:domainid', [check('domainid').isMongoId()], 
    validate, auth, async (req, res) => {
    try {
        const admin = await Controller.leaveDomain(req.params.domainid, req.admin);
        res.send(admin);
    } catch (e) {
        responseException(res, e, 400);
    }
});

export default router;