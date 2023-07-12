import express from 'express';
import { auth } from '../middleware/auth';
import { responseException } from '../exceptions';
import * as SwitcherAPI from '../external/switcher-api-facade';
import { validate, verifyInputUpdateParameters } from '../middleware/validators';
import { body } from 'express-validator';

const router = new express.Router();

router.post('/api-management/feature', auth, 
verifyInputUpdateParameters(['feature', 'parameters']), [
    body('feature').isString().notEmpty(),
    body('parameters').optional().isObject()
], validate, async (req, res) => {
    try {
        const status = await SwitcherAPI.checkManagementFeature(req.body.feature, req.body.parameters);
        res.send({ status });
    } catch (e) {
        responseException(res, e, 400);
    }
});

export default router;