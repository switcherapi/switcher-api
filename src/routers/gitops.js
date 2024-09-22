import express from 'express';
import { check } from 'express-validator';
import { responseException } from '../exceptions/index.js';
import { gitopsAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validators.js';
import { checkGitopsIntegration, SwitcherKeys } from '../external/switcher-api-facade.js';
import * as Service from '../services/gitops.js';

const router = new express.Router();

const featureFlagMiddleware = async (req, res, next) => {
    try {
        await checkGitopsIntegration(req.domain);
        next();
    } catch (e) {
        responseException(res, e, 400, SwitcherKeys.GITOPS_INTEGRATION);
    }
};

router.post('/gitops/v1/push', featureFlagMiddleware, gitopsAuth, [
    check('changes').exists(),
], validate, async (req, res) => {
    try {
        const result = await Service.pushChanges(req.domain, req.body.environment, req.body.changes);

        if (!result.valid) {
            return res.status(400).send(result);
        }

        res.status(200).send(result);
    } catch (e) {
        responseException(res, e, 500);
    }
});

export default router;