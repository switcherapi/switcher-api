import express from 'express';
import { checkConfig } from '../middleware/validators';
import { appAuth } from '../middleware/auth';
import { resolveCriteria } from '../client/resolvers';
import Domain from '../models/domain';
import { EnvType } from '../models/environment';
import { addMetrics } from '../models/metric'

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

        const result = await resolveCriteria(req.config, context, ['values', 'description', 'strategy', 'operation', 'activated', '-_id'])

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
        res.status(500).send()
    }
})

export default router;