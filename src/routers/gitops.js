import express from 'express';
import { body } from 'express-validator';
import { responseException } from '../exceptions/index.js';
import { gitopsAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validators.js';
import { featureFlag, validateChanges } from '../middleware/gitops.js';
import * as Service from '../services/gitops/index.js';

const router = new express.Router();

router.post('/gitops/v1/push', featureFlag, gitopsAuth, [
    body('environment').isString(),
    body('changes').isArray(),
    body('changes.*.path').isArray({ min: 0, max: 3 }),
    body('changes.*.action')
        .custom(value => ['NEW', 'CHANGED', 'DELETED'].includes(value))
        .withMessage('Request has invalid type of action'),
    body('changes.*.diff')
        .custom(value => ['GROUP', 'CONFIG', 'STRATEGY', 'STRATEGY_VALUE', 'COMPONENT'].includes(value))
        .withMessage('Request has invalid type of diff'),
], validate, validateChanges, async (req, res) => {
    try {
        const result = await Service.pushChanges(req.domain, req.body.environment, req.body.changes);
        res.status(200).send(result);
    } catch (e) {
        responseException(res, e, 500);
    }
});

export default router;