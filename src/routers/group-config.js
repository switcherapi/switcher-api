import express from 'express';
import { check } from 'express-validator';
import History from '../models/history';
import { auth } from '../middleware/auth';
import { validate, verifyInputUpdateParameters } from '../middleware/validators';
import { sortBy, verifyOwnership } from './common/index';
import { responseException } from '../exceptions';
import { ActionTypes, RouterTypes } from '../models/role';
import * as Controller from '../controller/group-config';
import { getDomainById } from '../controller/domain';

const router = new express.Router();

router.post('/groupconfig/create', auth, async (req, res) => {
    try {
        const groupconfig = await Controller.createGroup(req.body, req.admin);
        res.status(201).send(groupconfig);
    } catch (e) {
        responseException(res, e, 500);
    }
});

// GET /groupconfig?limit=10&skip=20
// GET /groupconfig?sortBy=createdAt:desc
// GET /groupconfig?domain=ID
router.get('/groupconfig', auth, async (req, res) => {
    try {
        const domain = await getDomainById(req.query.domain);
        await domain.populate({
            path: 'groupConfig',
            options: {
                limit: parseInt(req.query.limit),
                skip: parseInt(req.query.skip),
                sort: sortBy(req.query)
            }
        }).execPopulate();

        let groups = domain.groupConfig;
        groups = await verifyOwnership(req.admin, groups, domain._id, ActionTypes.READ, RouterTypes.GROUP, true);

        res.send(groups);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.get('/groupconfig/:id', [
    check('id').isMongoId()], validate, auth, async (req, res) => {
    try {
        let groupconfig = await Controller.getGroupConfigById(req.params.id);
        groupconfig = await verifyOwnership(req.admin, groupconfig, groupconfig.domain, ActionTypes.READ, RouterTypes.GROUP);

        res.send(groupconfig);
    } catch (e) {
        responseException(res, e, 500);
    }
});

// GET /groupconfig/ID?sortBy=date:desc
// GET /groupconfig/ID?limit=10&skip=20
// GET /groupconfig/ID
router.get('/groupconfig/history/:id', [
    check('id').isMongoId()], validate, auth, async (req, res) => {
    try {
        const groupconfig = await Controller.getGroupConfigById(req.params.id);
        const history = await History.find({ domainId: groupconfig.domain, elementId: groupconfig._id })
            .select('oldValue newValue updatedBy date -_id')
            .sort(sortBy(req.query))
            .limit(parseInt(req.query.limit))
            .skip(parseInt(req.query.skip));

        await verifyOwnership(req.admin, groupconfig, groupconfig.domain, ActionTypes.READ, RouterTypes.GROUP);

        res.send(history);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.delete('/groupconfig/history/:id', [
    check('id').isMongoId()], validate, auth, async (req, res) => {
    try {
        const groupconfig = await Controller.getGroupConfigById(req.params.id);
        await verifyOwnership(req.admin, groupconfig, groupconfig.domain, ActionTypes.DELETE, RouterTypes.ADMIN);

        await History.deleteMany({ domainId: groupconfig.domain, elementId: groupconfig._id });
        res.send(groupconfig);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.delete('/groupconfig/:id', [
    check('id').isMongoId()], validate, auth, async (req, res) => {
    try {
        let groupconfig = await Controller.deleteGroup(req.params.id, req.admin);
        res.send(groupconfig);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.patch('/groupconfig/:id', [
    check('id').isMongoId()], validate, auth, 
    verifyInputUpdateParameters(['name', 'description']), async (req, res) => {
    try {
        const groupconfig = await Controller.updateGroup(req.params.id, req.body, req.admin);
        res.send(groupconfig);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.patch('/groupconfig/updateStatus/:id', [
    check('id').isMongoId()], validate, auth, async (req, res) => {
    try {
        const groupconfig = await Controller.updateGroupStatusEnv(req.params.id, req.body, req.admin);
        res.send(groupconfig);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.patch('/groupconfig/removeStatus/:id', [
    check('id').isMongoId()], validate, auth, async (req, res) => {
    try {
        const groupconfig = await Controller.removeGroupStatusEnv(req.params.id, req.body, req.admin);
        res.send(groupconfig);
    } catch (e) {
        responseException(res, e, 500);
    }
});

export default router;