import express from 'express';
import { body } from 'express-validator';
import { responseExceptionSilent } from '../exceptions/index.js';
import { auth, gitopsAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validators.js';
import { featureFlag, validateChanges } from '../middleware/gitops.js';
import * as Service from '../services/gitops/index.js';

const router = new express.Router();
const regex = new RegExp(/^\d+[smh]$/);

const windowValidation = (value) => {
    if (!regex.test(value)) {
        throw new Error('Invalid window value');
    }

    if (value.endsWith('s') && parseInt(value) < 30) {
        throw new Error('Invalid window value (minimum 30s)');
    }

    return true;
};

const accountValidators = [
    body('token').isString().optional(),
    body('repository').isURL().withMessage('Invalid repository URL'),
    body('branch').isString().withMessage('Invalid branch name'),
    body('environment').isString().withMessage('Invalid environment name'),
    body('domain.id').isMongoId().withMessage('Invalid domain ID'),
    body('domain.name').isString().withMessage('Invalid domain name'),
    body('settings.active').isBoolean().withMessage('Invalid active flag'),
    body('settings.window').isString().custom(windowValidation),
    body('settings.forceprune').isBoolean().withMessage('Invalid forceprune flag'),
];

router.post('/gitops/v1/push', gitopsAuth, featureFlag, [
    body('environment').isString(),
    body('changes').isArray(),
    body('changes.*.path').isArray({ min: 0, max: 3 }),
    body('changes.*.action')
        .custom(value => ['NEW', 'CHANGED', 'DELETED'].includes(value))
        .withMessage('Request has invalid type of action'),
    body('changes.*.diff')
        .custom(value => ['GROUP', 'CONFIG', 'STRATEGY', 'COMPONENT'].includes(value))
        .withMessage('Request has invalid type of diff'),
], validate, validateChanges, async (req, res) => {
    try {
        const result = await Service.pushChanges(req.domain, req.body.environment, req.body.changes);
        res.status(200).send(result);
    } catch (e) {
        responseExceptionSilent(res, e, 500, 'One or more changes could not be applied');
    }
});

router.post('/gitops/v1/account/subscribe', auth, accountValidators, validate, 
    featureFlag, async (req, res) => {
    try {
        const account = await Service.subscribeAccount(req.body);
        res.status(201).send(account);
    } catch (e) {
        responseExceptionSilent(res, e, 500, 'Account subscription failed');
    }
});

export default router;