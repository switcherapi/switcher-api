import express from 'express';
import { body, check, query } from 'express-validator';
import jwt from 'jsonwebtoken';
import { checkConfig, checkConfigComponent, validate } from '../middleware/validators.js';
import { componentAuth, appGenerateCredentials } from '../middleware/auth.js';
import { resolveCriteria, checkDomain } from '../client/resolvers.js';
import { getConfigs } from '../services/config.js';
import { clientLimiter } from '../middleware/limiter.js';
import { StrategiesType } from '../models/config-strategy.js';

const router = new express.Router();

// GET /check?key=KEY
// GET /check?key=KEY&showReason=true
// GET /check?key=KEY&showStrategy=true
// GET /check?key=KEY&bypassMetric=true
router.post('/criteria', componentAuth, clientLimiter, [
    query('key').isLength({ min: 1 }).withMessage('Key is required'),
    body('entry').isArray().optional().withMessage('Entry must be an array'),
    body('entry.*.input').isString(),
    body('entry.*.strategy').isString()
        .custom(value => Object.values(StrategiesType).includes(value)).withMessage('Invalid strategy type')
], validate, checkConfig, checkConfigComponent, async (req, res) => {
    try {
        const environment = req.environment;
        const domain = req.domain;
        const entry = req.body.entry;

        const context = { domain, entry, environment, bypassMetric: req.query.bypassMetric, component: req.component };

        const response = await resolveCriteria(req.config, context, 'values description strategy operation activated -_id');

        delete response.domain;
        delete response.group;

        if ((req.query.showReason || 'false') === 'false') {
            delete response.reason;
        }

        if ((req.query.showStrategy || 'false') === 'false') {
            delete response.strategies;
        }

        res.send(response);
    } catch (e) {
        res.status(500).send({ error: e.message });
    }
});

router.get('/criteria/snapshot_check/:version', componentAuth, clientLimiter, async (req, res) => {
    try {
        const domain = await checkDomain(req.domain);
        const version = req.params.version;

        if (isNaN(version)) {
            return res.status(400).send({ error: 'Wrong value for domain version' });
        }

        if (domain.lastUpdate > version) {
            res.send({ status: false });
        } else {
            res.send({ status: true });
        }
    } catch (e) {
        res.status(500).send({ error: e.message });
    }
});

router.post('/criteria/switchers_check', componentAuth, clientLimiter, [
    check('switchers', 'Switcher Key is required').isArray().isLength({ min: 1 })
], validate, async (req, res) => {
    try {
        const configsFound = await getConfigs({ domain: req.domain, components: req.componentId });
        const configs = configsFound.map(config => config.key);
        res.send({ not_found: req.body.switchers.filter(switcher => !configs.includes(switcher)) });
    } catch (e) {
        res.status(500).send({ error: e.message });
    }
});

router.post('/criteria/auth', appGenerateCredentials, clientLimiter, async (req, res) => {
    try {
        const { exp } = jwt.decode(req.token);
        res.send({ token: req.token, exp });
    } catch (e) {
        res.status(400).send({ error: e.message });
    }
});

export default router;