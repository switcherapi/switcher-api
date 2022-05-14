import express from 'express';
import History from '../models/history';
import { auth } from '../middleware/auth';
import { check } from 'express-validator';
import { validate, verifyInputUpdateParameters } from '../middleware/validators';
import { verifyOwnership, sortBy } from './common/index';
import { ActionTypes, RouterTypes } from '../models/role';
import { checkDomain, SwitcherKeys } from '../external/switcher-api-facade';
import * as Controller from '../controller/domain';
import { responseException } from '../exceptions';

const router = new express.Router();

router.post('/domain/create', 
    verifyInputUpdateParameters(['name', 'description']), [
        check('name').isLength({ min: 5, max: 50 }), 
        check('description').isLength({ min: 0, max: 500 })
    ], validate, auth, async (req, res) => {
    try {
        await checkDomain(req);
        const domain = await Controller.createDomain(req.body, req.admin);
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
    res.send(req.admin.domain);
});

router.get('/domain/:id', [check('id').isMongoId()], 
    validate, auth, async (req, res) => {
    try {
        let domain = await Controller.getDomainById(req.params.id);
        domain = await verifyOwnership(req.admin, domain, domain._id, ActionTypes.READ, RouterTypes.DOMAIN, true);
        res.send(domain);
    } catch (e) {
        responseException(res, e, 400);
    }
});

// GET /domain/ID?sortBy=date:desc
// GET /domain/ID?limit=10&skip=20
// GET /domain/ID
router.get('/domain/history/:id', [check('id').isMongoId()], 
    validate, auth, async (req, res) => {
    try {
        const domain = await Controller.getDomainById(req.params.id);
        const history = await History.find({ elementId: domain._id })
            .select('oldValue newValue updatedBy date -_id')
            .sort(sortBy(req.query))
            .limit(parseInt(req.query.limit || 10))
            .skip(parseInt(req.query.skip || 0));

        await verifyOwnership(req.admin, domain, domain._id, ActionTypes.READ, RouterTypes.DOMAIN);

        res.send(history);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.delete('/domain/history/:id', [check('id').isMongoId()], 
    validate, auth, async (req, res) => {
    try {
        const domain = await Controller.deleteDomainHistory(req.params.id, req.admin);
        res.send(domain);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.delete('/domain/:id', [check('id').isMongoId()], 
    validate, auth, async (req, res) => {
    try {
        let domain = await Controller.deleteDomain(req.params.id, req.admin);
        res.send(domain);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.patch('/domain/transfer/request', [check('domain').isMongoId()], 
    validate, auth, async (req, res) => {
    try {
        let domain = await Controller.transferDomain(req.body, req.admin);
        res.send(domain);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.patch('/domain/transfer/accept', [check('domain').isMongoId()], 
    validate, auth, async (req, res) => {
    try {
        const domain = await Controller.transferDomainAccept(req.body, req.admin);
        res.send(domain);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.patch('/domain/:id', [check('id').isMongoId()], validate, auth,
    verifyInputUpdateParameters(['description']), async (req, res) => {
    try {
        const domain = await Controller.updateDomain(req.params.id, req.body, req.admin);
        res.send(domain);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.patch('/domain/updateStatus/:id', [check('id').isMongoId()], 
    validate, auth, async (req, res) => {
    try {
        const domain = await Controller.updateDomainStatus(req.params.id, req.body, req.admin);
        res.send(domain);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.patch('/domain/removeStatus/:id', [check('id').isMongoId()], 
    validate, auth, async (req, res) => {
    try {
        let domain = await Controller.removeDomainStatusEnv(req.params.id, req.body.env, req.admin);
        res.send(domain);
    } catch (e) {
        responseException(res, e, 400);
    }
});

export default router;