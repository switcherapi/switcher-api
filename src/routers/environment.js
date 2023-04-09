import express from 'express';
import { check, query } from 'express-validator';
import { auth } from '../middleware/auth';
import { responseException } from '../exceptions';
import { validate, verifyInputUpdateParameters } from '../middleware/validators';
import * as Services from '../services/environment';
import { SwitcherKeys } from '../external/switcher-api-facade';

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
                skip: parseInt(req.query.skip || 0),
                limit: parseInt(req.query.limit || 10),
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
        await environment.deleteOne();
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