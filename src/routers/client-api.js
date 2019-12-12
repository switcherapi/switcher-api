import express from 'express';
import jwt from 'jsonwebtoken';
import { checkConfig } from '../middleware/validators';
import { appAuth, appGenerateCredentials } from '../middleware/auth';
import { resolveCriteria } from '../client/resolvers';
import { EnvType } from '../models/environment';
import { addMetrics } from '../models/metric'
import { compileFunction } from 'vm';

const router = new express.Router()

// GET /check?key=KEY
// GET /check?key=KEY&showReason=true
// GET /check?key=KEY&showStrategy=true
// GET /check?key=KEY&bypassMetric=true
router.get('/criteria', appAuth, checkConfig, async (req, res) => {
    try {
        const environment = req.environment
        const domain = req.domain
        const entry = req.body.entry

        const context = { domain, entry, environment }

        const result = await resolveCriteria(req.config, context, 'values description strategy operation activated -_id')

        if (result) {
            if (!req.query.bypassMetric && environment === EnvType.DEFAULT) {
                addMetrics(req, result)
            }

            delete result.domain
            delete result.group

            if (!req.query.showReason) {
                delete result.reason
            }

            if (!req.query.showStrategy) {
                delete result.strategies
            }

            res.send(result)
        } else {
            res.status(500).send({ error: 'Something went wrong while executing the criteria validation' })
        }
    } catch (e) {
        console.log(e)
        res.status(500).send()
    }
})

router.get('/criteria/auth', appGenerateCredentials, async (req, res) => {
    try {
        const { exp } = jwt.decode(req.token)
        res.send({ token: req.token, exp })
    } catch (e) {
        res.status(400).send()
    }
})

export default router;