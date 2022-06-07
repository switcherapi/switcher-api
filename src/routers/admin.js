import express from 'express';
import { auth, authRefreshToken } from '../middleware/auth';
import { validate, verifyInputUpdateParameters } from '../middleware/validators';
import { check } from 'express-validator';
import { verifyOwnership } from '../helpers';
import { responseException } from '../exceptions';
import * as Services from '../services/admin';
import { SwitcherKeys } from '../external/switcher-api-facade';

const router = new express.Router();

router.post('/admin/signup', [
    check('name').isLength({ min: 2 }),
    check('email').isEmail(),
    check('password').isLength({ min: 5 })
], validate, async (req, res) => {
    try {
        const admin = await Services.signUp(
            req.body, req.connection.remoteAddress);

        res.status(201).send({ admin });
    } catch (e) {
        responseException(res, e, 400, SwitcherKeys.ACCOUNT_CREATION);
    }
});

router.post('/admin/signup/authorization', async (req, res) => {
    try {
        const { admin, jwt } = await Services.signUpAuth(req.query.code);
        res.status(201).send({ admin, jwt });
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.post('/admin/github/auth', async (req, res) => {
    try {
        const { admin, jwt } = await Services.signUpGitHub(req.query.code);
        res.status(201).send({ admin, jwt });
    } catch (e) {
        res.status(401).send({ error: e.message });
    }
});

router.post('/admin/bitbucket/auth', async (req, res) => {
    try {
        const { admin, jwt } = await Services.signUpBitbucket(req.query.code);
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
        const { admin, jwt } = await Services.signIn(
            req.body.email, req.body.password);

        res.send({ admin, jwt });
    } catch (e) {
        res.status(401).send({ error: 'Invalid email/password' });
    }
});

router.post('/admin/login/request/recovery', [ 
    check('email').isEmail()
], validate, async (req, res) => {
    await Services.loginRequestRecovery(req.body.email);
    res.status(200).send({ message: 'Request received' });
});

router.post('/admin/login/recovery', async (req, res) => {
    try {
        const { admin, jwt } = await Services.loginRecovery(
            req.body, req.connection.remoteAddress);

        res.status(200).send({ admin, jwt });
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.post('/admin/logout', auth, async (req, res) => {
    await Services.logout(req.admin);
    res.send();
});

router.post('/admin/refresh/me', authRefreshToken, async (_req, res) => {
    res.status(200).send(res.jwt);
});

router.get('/admin/me', auth, async (req, res) => {
    await req.admin.populate({ path: 'team_list' });
    res.send(req.admin);
});

router.post('/admin/collaboration/permission', auth, [
    check('domain', 'Domain Id is required').isMongoId(),
    check('action', 'Array of actions is required').isArray({ min: 1 }),
    check('router', 'Router name is required').isLength({ min: 1 })
], validate, async (req, res) => {
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
            result.push({ action: action_perm.toString(), result: 'ok' });
        } catch (e) {
            result.push({ action : action_perm.toString(), result: 'nok' });
        }
    }
    
    res.send(result);
});

router.get('/admin/collaboration', auth, async (req, res) => {
    await req.admin.populate({ path: 'team_list' });
    const domains = req.admin.team_list.map(adm => adm.domain.toString());
    res.send(Array.from(new Set(domains)));
});

router.get('/admin/:id', auth, async (req, res) => {
    try {
        const admin = await Services.getAdminById(req.params.id);
        res.send(admin);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.delete('/admin/me', auth, async (req, res) => {
    try {
        const admin = await Services.deleteAccount(req.admin);
        res.send(admin);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.patch('/admin/me', auth, verifyInputUpdateParameters([
    'name', 'email', 'password'
]), async (req, res) => {
    const admin = await Services.updateAccount(req.body, req.admin);
    res.send(admin);
});

router.patch('/admin/me/team/leave/:domainid', auth, [
    check('domainid').isMongoId()
], validate, async (req, res) => {
    try {
        const admin = await Services.leaveDomain(req.params.domainid, req.admin);
        res.send(admin);
    } catch (e) {
        responseException(res, e, 400);
    }
});

export default router;