import express from 'express';
import { check, query } from 'express-validator';
import { auth } from '../middleware/auth.js';
import { validate, verifyInputUpdateParameters } from '../middleware/validators.js';
import * as Services from '../services/component.js';
import { responseException } from '../exceptions/index.js';
import { SwitcherKeys } from '../external/switcher-api-facade.js';

const router = new express.Router();

router.post('/component/create', auth, [
    check('name').isLength({ min: 2, max: 50 }),
    check('description').isLength({ max: 256 })
], validate, async (req, res) => {
    try {
        const { component, apiKey } = await Services.createComponent(req.body, req.admin);
        res.status(201).send({ component, apiKey });
    } catch (e) {
        responseException(res, e, 400, SwitcherKeys.ELEMENT_CREATION);
    }
});

router.get('/component/generateApiKey/:component/', auth, [
    check('component', 'Invalid Id for component').isMongoId()
], validate, async (req, res) => {
    try {
        const apiKey = await Services.generateApiKey(req.params.component, req.admin);
        res.status(201).send({ apiKey });
    } catch (e) {
        responseException(res, e, 400);
    }
});

// GET /component?domain=ID&limit=10&skip=20
// GET /component?domain=ID&sort=desc
// GET /component?domain=ID
router.get('/component', auth, [
    query('domain', 'Please, specify the \'domain\' id').isMongoId()
], validate, async (req, res) => {
    try {
        let components = await Services.getComponents({ domain: req.query.domain },
            ['_id', 'name', 'description'],
            {
                skip: Number.parseInt(req.query.skip || 0),
                limit: Number.parseInt(req.query.limit || 10),
                sort: {
                    name: req.query.sort === 'desc' ? -1 : 1
                }
            });

        res.send(components);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.get('/component/:id', auth, [
    check('id', 'Invalid Id for component').isMongoId()
], validate, async (req, res) => {
    try {
        const component = await Services.getComponentById(req.params.id);
        res.send(component);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.patch('/component/:id', auth, verifyInputUpdateParameters(['name', 'description']), [
    check('id', 'Invalid Id for component').isMongoId()
], validate, async (req, res) => {
    try {
        const component = await Services.updateComponent(req.params.id, req.body, req.admin);
        res.send(component);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.delete('/component/:id', auth, [
    check('id', 'Invalid Id for component').isMongoId()
], validate, async (req, res) => {
    try {
        const component = await Services.deleteComponent(req.params.id, req.admin);
        res.send(component);
    } catch (e) {
        responseException(res, e, 400);
    }
});

export default router;