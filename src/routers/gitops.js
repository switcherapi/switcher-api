import express from 'express';
import { body, check } from 'express-validator';
import { responseExceptionSilent } from '../exceptions/index.js';
import { auth, gitopsAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validators.js';
import { featureFlag, validateChanges } from '../middleware/gitops.js';
import { notifyGitopsSubscription } from '../external/switcher-api-facade.js';
import * as Service from '../services/gitops/index.js';
import { verifyOwnership } from '../helpers/index.js';
import { ActionTypes, RouterTypes } from '../models/permission.js';

const router = new express.Router();

// Allow only values like 1s, 1m, 1h
const regexWindowInterval = new RegExp(/^\d+[smh]$/);

// Allow slash, alphanumeric, hyphen, underscore, dot only
const regexPath = new RegExp(/^[a-zA-Z0-9/_\-.]+$/);

const windowValidation = (value) => {
    if (!regexWindowInterval.test(value)) {
        throw new Error('Invalid window value');
    }

    if (value.endsWith('s') && parseInt(value) < 30) {
        throw new Error('Invalid window value (minimum 30s)');
    }

    if (parseInt(value) < 1) {
        throw new Error('Invalid window value (minimum 1[m/h])');
    }

    return true;
};

const pathValidation = (value) => {
    if (value.length === 0) {
        return true;
    }
    
    if (value.startsWith('/') || value.endsWith('/') || value.includes('//')) {
        throw new Error('Invalid path value - cannot start or end with / or contain //');
    }

    if (!regexPath.test(value)) {
        throw new Error('Invalid path value - only alphanumeric characters and / are allowed');
    }

    return true;
};

const accountValidators = [
    body('token').isString().optional(),
    body('repository').isURL().withMessage('Invalid repository URL'),
    body('branch').isString().withMessage('Invalid branch name'),
    body('path').isString().optional().custom(pathValidation),
    body('environment').isString().withMessage('Invalid environment name'),
    body('domain.id').isMongoId().withMessage('Invalid domain ID'),
    body('domain.name').isString().withMessage('Invalid domain name'),
    body('settings.active').isBoolean().withMessage('Invalid active flag'),
    body('settings.window').isString().custom(windowValidation),
    body('settings.forceprune').isBoolean().withMessage('Invalid forceprune flag'),
];

const verifyOwnershipMiddleware = async (req, res, next) => {
    try {
        const domainId = req.body?.domain.id || req.params.domain;
        await verifyOwnership(req.admin, domainId, domainId, ActionTypes.UPDATE, RouterTypes.ADMIN);
        next();
    } catch (e) {
        responseExceptionSilent(res, e, 403, 'Permission denied');
    }
};

router.post('/gitops/v1/push', gitopsAuth, featureFlag, [
    body('environment').isString(),
    body('changes').isArray(),
    body('changes.*.path').isArray({ min: 0, max: 3 }),
    body('changes.*.action')
        .custom(value => ['NEW', 'CHANGED', 'DELETED'].includes(value))
        .withMessage('Request has invalid type of action'),
    body('changes.*.diff')
        .custom(value => ['GROUP', 'CONFIG', 'STRATEGY', 'RELAY', 'COMPONENT'].includes(value))
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
    featureFlag, verifyOwnershipMiddleware, async (req, res) => {
    try {
        const account = await Service.subscribeAccount(req.body);
        notifyGitopsSubscription('subscribe');

        res.status(201).send(account);
    } catch (e) {
        responseExceptionSilent(res, e, 500, 'Account subscription failed');
    }
});

router.post('/gitops/v1/account/unsubscribe', auth, [
    body('environment').isString(),
    body('domain.id').isMongoId().withMessage('Invalid domain ID'),
], validate, featureFlag, verifyOwnershipMiddleware, async (req, res) => {
    try {
        await Service.unsubscribeAccount(req.body);
        notifyGitopsSubscription('unsubscribe');

        res.status(200).send();
    } catch (e) {
        responseExceptionSilent(res, e, 500, 'Account unsubscription failed');
    }
});

router.put('/gitops/v1/account', auth, accountValidators, validate, 
    featureFlag, verifyOwnershipMiddleware, async (req, res) => {
    try {
        const account = await Service.updateAccount(req.body);
        res.status(200).send(account);
    } catch (e) {
        responseExceptionSilent(res, e, 500, 'Account update failed');
    }
});

router.put('/gitops/v1/account/tokens', auth, [
    body('token').isString(),
    body('environments').isArray(),
    body('domain.id').isMongoId().withMessage('Invalid domain ID'),
], validate, featureFlag, verifyOwnershipMiddleware, async (req, res) => {
    try {
        const result = await Service.updateAccountTokens(req.body);
        res.status(200).send(result);
    } catch (e) {
        responseExceptionSilent(res, e, 500, 'Account token update failed');
    }
});

router.put('/gitops/v1/account/forcesync', auth, [
    body('environment').isString(),
    body('domain.id').isMongoId().withMessage('Invalid domain ID'),
], validate, featureFlag, verifyOwnershipMiddleware, async (req, res) => {
    try {
        const account = await Service.forceSyncAccount(req.body);
        res.status(200).send(account);
    } catch (e) {
        responseExceptionSilent(res, e, 500, 'Account force sync failed');
    }
});

router.get('/gitops/v1/account/:domain', auth, [
    check('domain').isMongoId().withMessage('Invalid domain ID'),
    check('environment').optional().isString(),
], validate, featureFlag, verifyOwnershipMiddleware, async (req, res) => {
    try {
        const accounts = await Service.fetchAccounts(req.params.domain, req.query.environment || null);
        res.status(200).send(accounts);
    } catch (e) {
        responseExceptionSilent(res, e, 500, 'Error fetching accounts');
    }
});

export default router;