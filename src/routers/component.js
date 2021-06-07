import express from 'express';
import { auth } from '../middleware/auth';
import { validate, verifyInputUpdateParameters } from '../middleware/validators';
import { check, query } from 'express-validator';
import * as Controller from '../controller/component';
import { responseException } from '../exceptions';
import { SwitcherKeys } from '../external/switcher-api-facade';

const router = new express.Router();

router.post('/component/create', [
    check('name').isLength({ min: 2, max: 50 }),
    check('description').isLength({ min: 2, max: 500 })
], validate, auth, async (req, res) => {
    try {
        const { component, apiKey } = await Controller.createComponent(req.body, req.admin);
        res.status(201).send({ component, apiKey });
    } catch (e) {
        responseException(res, e, 400, SwitcherKeys.ELEMENT_CREATION);
    }
});

router.get('/component/generateApiKey/:component/', [
    check('component', 'Invalid Id for component').isMongoId()
], validate, auth, async (req, res) => {
    try {
        const apiKey = await Controller.generateApiKey(req.params.component, req.admin);
        res.status(201).send({ apiKey });
    } catch (e) {
        responseException(res, e, 400);
    }
});

// GET /component?domain=ID&limit=10&skip=20
// GET /component?domain=ID&sort=desc
// GET /component?domain=ID
router.get('/component', [query('domain', 'Please, specify the \'domain\' id').isMongoId()], 
    validate, auth, async (req, res) => {
    try {
        let components = await Controller.getComponents({ domain: req.query.domain },
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

router.get('/component/:id', [check('id', 'Invalid Id for component').isMongoId()], 
    validate, auth, async (req, res) => {
    try {
        const component = await Controller.getComponentById(req.params.id);
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
        const component = await Controller.updateComponent(req.params.id, req.body, req.admin);
        res.send(component);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.delete('/component/:id', [
    check('id', 'Invalid Id for component').isMongoId()], 
    validate, auth, async (req, res) => {
    try {
        const component = await Controller.deleteComponent(req.params.id, req.admin);
        res.send(component);
    } catch (e) {
        responseException(res, e, 400);
    }
});

export default router;