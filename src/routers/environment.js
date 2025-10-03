import express from 'express';
import { check, query } from 'express-validator';
import { auth } from '../middleware/auth.js';
import { responseException } from '../exceptions/index.js';
import { validate, verifyInputUpdateParameters } from '../middleware/validators.js';
import * as Services from '../services/environment.js';
import { SwitcherKeys } from '../external/switcher-api-facade.js';

const router = new express.Router();

router.post('/environment/create', auth, verifyInputUpdateParameters([
    'name', 'domain'
]), async (req, res) => {
    try {
        const environment = await Services.createEnvironment(req.body, req.admin);
        res.status(201).send(environment);
    } catch (e) {
        responseException(res, e, 400, SwitcherKeys.ELEMENT_CREATION);
    }
});

// GET /environment?domain=ID&limit=10&skip=20
// GET /environment?domain=ID&sort=desc
// GET /environment?domain=ID
router.get('/environment', auth, [
    query('domain', 'Please, specify the \'domain\' id').isMongoId()
], validate, async (req, res) => {
    try {
        let environments = await Services.getEnvironments({ domain: req.query.domain },
            ['_id', 'name'],
            {
                skip: Number.parseInt(req.query.skip || 0),
                limit: Number.parseInt(req.query.limit || 10),
                sort: {
                    name: req.query.sort === 'desc' ? -1 : 1
                }
            });

        res.send(environments);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.get('/environment/:id', auth, [
    check('id', 'Invalid Id for environment').isMongoId()
], validate, async (req, res) => {
    try {
        const environment = await Services.getEnvironmentById(req.params.id);
        res.send(environment);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.delete('/environment/:id', auth, [
    check('id', 'Invalid Id for environment').isMongoId()
], validate, async (req, res) => {
    try {
        const environment = await Services.deleteEnvironment(req.params.id, req.admin);
        res.send(environment);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.patch('/environment/recover/:id', auth, [
    check('id', 'Invalid Id for environment').isMongoId()
], validate, async (req, res) => {
    try {
        const environment = await Services.recoverEnvironment(req.params.id, req.admin);
        res.send({ message: `Environment '${environment.name}' recovered` });
    } catch (e) {
        responseException(res, e, 400);
    }
});

export default router;