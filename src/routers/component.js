import express from 'express';
import { auth } from '../middleware/auth';
import { verifyOwnership, responseException, formatInput } from './common/index';
import { validate, verifyInputUpdateParameters } from '../middleware/validators';
import { check } from 'express-validator';
import Component from '../models/component';
import { ActionTypes, RouterTypes } from '../models/role';
import { checkComponent } from '../external/switcher-api-facade';

const router = new express.Router();

router.post('/component/create', [
    check('name').isLength({ min: 2, max: 50 }),
    check('description').isLength({ min: 2, max: 500 })
], validate, auth, async (req, res) => {
    let component = new Component({
        ...req.body,
        owner: req.admin._id
    });

    try {
        await checkComponent(req.body.domain);
        component.name = formatInput(component.name);
        component = await verifyOwnership(req.admin, component, req.body.domain, ActionTypes.CREATE, RouterTypes.COMPONENT);
        const apiKey = await component.generateApiKey();
        await component.save();
        res.status(201).send({ component, apiKey });
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.get('/component/generateApiKey/:component/', [
    check('component', 'Invalid Id for component').isMongoId()
], validate, auth, async (req, res) => {
    try {
        let component = await Component.findById(req.params.component);

        if (!component) {
            return res.status(404).send();
        }

        component = await verifyOwnership(
            req.admin, component, component.domain, ActionTypes.UPDATE, RouterTypes.COMPONENT);
        component.updatedBy = req.admin.email;

        const apiKey = await component.generateApiKey();
        
        res.status(201).send({ apiKey });
    } catch (e) {
        responseException(res, e, 400);
    }
});

// GET /component?domain=ID&limit=10&skip=20
// GET /component?domain=ID&sort=desc
// GET /component?domain=ID
router.get('/component', auth, async (req, res) => {
    if (!req.query.domain) {
        return res.status(422).send({
            error: 'Please, specify the \'domain\' id'
        });
    }

    try {
        let components = await Component.find({ domain: req.query.domain },
            ['_id', 'name', 'description'],
            {
                skip: parseInt(req.query.skip),
                limit: parseInt(req.query.limit),
                sort: {
                    name: req.query.sort === 'desc' ? -1 : 1
                }
            });

        res.send(components);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.get('/component/:id', [
    check('id', 'Invalid Id for component').isMongoId()
], validate, auth, async (req, res) => {
    try {
        let component = await Component.findById(req.params.id);

        if (!component) {
            return res.status(404).send();
        }

        res.send(component);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.patch('/component/:id', [
    check('id', 'Invalid Id for component').isMongoId()], 
    verifyInputUpdateParameters(['name', 'description']),
    validate, auth, async (req, res) => {

    try {
        let component = await Component.findById(req.params.id);
 
        if (!component) {
            return res.status(404).send();
        }

        component = await verifyOwnership(
            req.admin, component, component.domain, ActionTypes.UPDATE, RouterTypes.COMPONENT);

        req.updates.forEach((update) => component[update] = req.body[update]);
        component.name = formatInput(component.name);
        await component.save();
        res.send(component);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.delete('/component/:id', [
    check('id', 'Invalid Id for component').isMongoId()], 
    validate, auth, async (req, res) => {

    try {
        let component = await Component.findById(req.params.id);

        if (!component) {
            return res.status(404).send();
        }

        component = await verifyOwnership(
            req.admin, component, component.domain, ActionTypes.DELETE, RouterTypes.COMPONENT);

        await component.remove();
        res.send(component);
    } catch (e) {
        responseException(res, e, 400);
    }
});

export default router;