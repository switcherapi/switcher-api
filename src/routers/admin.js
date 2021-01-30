import express from 'express';
import Admin from '../models/admin';
import { Team } from '../models/team';
import { auth, authRefreshToken } from '../middleware/auth';
import { validate, verifyInputUpdateParameters } from '../middleware/validators';
import { check } from 'express-validator';
import { verifyOwnership } from './common';
import { getGitToken, getGitUserInfo } from '../external/oauth-git';
import { getBitBucketToken, getBitBucketUserInfo } from '../external/oauth-bitbucket';
import { validate_token } from '../external/google-recaptcha';
import { sendAuthCode, sendAccountRecoveryCode } from '../external/sendgrid';
import Domain from '../models/domain';
import { checkAdmin } from '../external/switcher-api-facade';
import { NotFoundError, responseException } from '../exceptions';

const router = new express.Router();

router.post('/admin/signup', [
    check('name').isLength({ min: 2 }),
    check('email').isEmail(),
    check('password').isLength({ min: 5 })
], validate, async (req, res) => {
    try {
        await checkAdmin(req.body.email);
        await validate_token(req);
        const admin = new Admin(req.body);
        const code = await admin.generateAuthCode();
        await admin.save();

        sendAuthCode(admin.email, admin.name, code);
        res.status(201).send({ admin });
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.post('/admin/signup/authorization', async (req, res) => {
    try {
        let admin = await Admin.findUserByAuthCode(req.query.code, false);

        if (!admin) {
            throw new NotFoundError('Account not found');
        }

        admin.active = true;
        admin.code = null;
        const jwt = await admin.generateAuthToken();

        await admin.save();
        res.status(201).send({ admin, jwt });
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.post('/admin/github/auth', async (req, res) => {
    try {
        const token = await getGitToken(req.query.code);
        const userInfo = await getGitUserInfo(token);

        let admin = await Admin.findUserByGitId(userInfo.id);
        admin = await Admin.createThirdPartyAccount(
            admin, userInfo, 'github', '_gitid', checkAdmin);
    
        const jwt = await admin.generateAuthToken();
        res.status(201).send({ admin, jwt });
    } catch (e) {
        res.status(401).send({ error: e.message });
    }
});

router.post('/admin/bitbucket/auth', async (req, res) => {
    try {
        const token = await getBitBucketToken(req.query.code);
        const userInfo = await getBitBucketUserInfo(token);

        let admin = await Admin.findUserByBitBucketId(userInfo.id);
        admin = await Admin.createThirdPartyAccount(
            admin, userInfo, 'bitbucket', '_bitbucketid', checkAdmin);
    
        const jwt = await admin.generateAuthToken();
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
        const admin = await Admin.findByCredentials(req.body.email, req.body.password);
        const jwt = await admin.generateAuthToken();
        res.send({ admin, jwt });
    } catch (e) {
        res.status(401).send({ error: 'Invalid email/password' });
    }
});

router.post('/admin/login/request/recovery', 
    check('email').isEmail(), validate, async (req, res) => {

    const admin = await Admin.findOne({ email: req.body.email });
    if (admin) {
        const code = await admin.generateAuthCode();
        admin.save();
        sendAccountRecoveryCode(admin.email, admin.name, code);
    }

    res.status(200).send({ message: 'Request received' });
});

router.post('/admin/login/recovery', async (req, res) => {
    try {
        await validate_token(req);
        let admin = await Admin.findUserByAuthCode(req.body.code, true);

        if (!admin) {
            throw new NotFoundError('Account not found');
        }

        admin.code = null;
        admin.password = req.body.password;
        const jwt = await admin.generateAuthToken();
        res.status(200).send({ admin, jwt });
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.post('/admin/logout', auth, async (req, res) => {
    req.admin.token = null;
    await req.admin.save();
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
});

router.get('/admin/collaboration', auth, async (req, res) => {
    await req.admin.populate({ path: 'team_list' }).execPopulate();
    const domains = req.admin.team_list.map(adm => adm.domain.toString());
    res.send(Array.from(new Set(domains)));
});

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
});

router.delete('/admin/me', auth, async (req, res) => {
    try {
        const domains = await Domain.find({ owner: req.admin._id }).countDocuments();
        if (domains > 0) {
            throw new Error(
                `This account has ${domains} Domain(s) that must be either deleted or transfered to another account.`);
        }

        await req.admin.remove();
        res.send(req.admin);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.patch('/admin/me', verifyInputUpdateParameters(['name', 'email', 'password']), 
    auth, async (req, res) => {

    req.updates.forEach((update) => req.admin[update] = req.body[update]);
    await req.admin.save();
    res.send(req.admin);
});

router.patch('/admin/me/team/leave/:domainid', [check('domainid').isMongoId()], 
    validate, auth, async (req, res) => {
        
    try {
        const teams = await Team.find({ domain: req.params.domainid, members: req.admin.id });

        if (!teams.length) {
            throw new NotFoundError('No team found for this given domain id');
        }

        for (let i = 0; i < teams.length; i++) {
            let indexMmeber = teams[i].members.indexOf(req.admin.id);
            teams[i].members.splice(indexMmeber, 1);
            await teams[i].save();

            let indexTeam = req.admin.teams.indexOf(teams[i]._id);
            req.admin.teams.splice(indexTeam, 1);
            await req.admin.save();
        }

        res.send(req.admin);
    } catch (e) {
        responseException(res, e, 400);
    }
});

export default router;