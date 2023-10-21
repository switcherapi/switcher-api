import express from 'express';
import { auth } from '../middleware/auth';
import { check } from 'express-validator';
import { validate, verifyInputUpdateParameters } from '../middleware/validators';
import { verifyOwnership, sortBy } from '../helpers';
import { ActionTypes, RouterTypes } from '../models/permission';
import { checkDomain, SwitcherKeys } from '../external/switcher-api-facade';
import * as Services from '../services/domain';
import { getHistory } from '../services/history';
import { responseException } from '../exceptions';

const router = new express.Router();

router.post('/domain/create', auth, verifyInputUpdateParameters(['name', 'description']), [
    check('name').isLength({ min: 5, max: 30 }), 
    check('description').isLength({ min: 0, max: 256 })
], validate, async (req, res) => {
    try {
        await checkDomain(req);
        const domain = await Services.createDomain(req.body, req.admin);
        res.status(201).send(domain);
    } catch (e) {
        responseException(res, e, 400, SwitcherKeys.ELEMENT_CREATION);
    }
});

// GET /domain?limit=10&skip=20
// GET /domain?sortBy=createdAt:desc
router.get('/domain', auth, async (req, res) => {
    await req.admin.populate({
        path: 'domain',
        options: {
            limit: parseInt(req.query.limit || 10),
            skip: parseInt(req.query.skip || 0),
            sort: sortBy(req.query)
        }
    });

    req.admin.domain.forEach(domain => domain.admin = {
        _id: req.admin._id,
        name: req.admin.name
    });

    res.send(req.admin.domain);
});

router.get('/domain/collaboration', auth, async (req, res) => {
    await req.admin.populate({ path: 'team_list' });

    const domains = [];
    for (const adm of req.admin.team_list) {
        domains.push(await Services.getDomainById(adm.domain.toString(), false, true));
    }

    res.send(domains);
});

router.get('/domain/:id', auth, [
    check('id').isMongoId()
], validate, async (req, res) => {
    try {
        let domain = await Services.getDomainById(req.params.id, false, true);
        domain = await verifyOwnership(req.admin, domain, domain._id, ActionTypes.READ, RouterTypes.DOMAIN, true);
        res.send(domain);
    } catch (e) {
        responseException(res, e, 400);
    }
});

// GET /domain/ID?sortBy=date:desc
// GET /domain/ID?limit=10&skip=20
// GET /domain/ID
router.get('/domain/history/:id', auth, [
    check('id').isMongoId()
], validate, async (req, res) => {
    try {
        const domain = await Services.getDomainById(req.params.id);

        const query = 'oldValue newValue updatedBy date -_id';
        const history = await getHistory(query, domain._id, domain._id, req.query);

        await verifyOwnership(req.admin, domain, domain._id, ActionTypes.READ, RouterTypes.DOMAIN);

        res.send(history);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.delete('/domain/history/:id', auth, [
    check('id').isMongoId()
], validate, async (req, res) => {
    try {
        const domain = await Services.deleteDomainHistory(req.params.id, req.admin);
        res.send(domain);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.delete('/domain/:id', auth, [
    check('id').isMongoId()
], validate, async (req, res) => {
    try {
        let domain = await Services.deleteDomain(req.params.id, req.admin);
        res.send(domain);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.patch('/domain/transfer/request', auth, [
    check('domain').isMongoId()
], validate, async (req, res) => {
    try {
        let domain = await Services.transferDomain(req.body, req.admin);
        res.send(domain);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.patch('/domain/transfer/accept', auth, [
    check('domain').isMongoId()
], validate, async (req, res) => {
    try {
        const domain = await Services.transferDomainAccept(req.body, req.admin);
        res.send(domain);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.patch('/domain/:id', auth, verifyInputUpdateParameters(['description']), [
    check('id').isMongoId(),
    check('description').isLength({ min: 0, max: 256 })
], validate, async (req, res) => {
    try {
        const domain = await Services.updateDomain(req.params.id, req.body, req.admin);
        res.send(domain);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.patch('/domain/updateStatus/:id', auth, [
    check('id').isMongoId()
], validate, async (req, res) => {
    try {
        const domain = await Services.updateDomainStatus(req.params.id, req.body, req.admin);
        res.send(domain);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.patch('/domain/removeStatus/:id', auth, [
    check('id').isMongoId()
], validate, async (req, res) => {
    try {
        let domain = await Services.removeDomainStatusEnv(req.params.id, req.body.env, req.admin);
        res.send(domain);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.patch('/domain/relay/verificationCode/:id', auth, [
    check('id').isMongoId()
], validate, async (req, res) => {
    try {
        const code = await Services.getRelayVerificationCode(req.params.id, req.admin);
        res.send({ code });
    } catch (e) {
        responseException(res, e, 500);
    }
});

export default router;