import express from 'express';
import jwt from 'jsonwebtoken';
import { checkConfig } from '../middleware/validators';
import { appAuth, appGenerateCredentials } from '../middleware/auth';
import { resolveCriteria } from '../client/resolvers';

const router = new express.Router()

// GET /check?key=KEY
// GET /check?key=KEY&showReason=true
// GET /check?key=KEY&showStrategy=true
// GET /check?key=KEY&bypassMetric=true
router.post('/criteria', appAuth, checkConfig, async (req, res) => {
    try {
        const environment = req.environment
        const domain = req.domain
        const entry = req.body.entry

        const context = { domain, entry, environment, bypassMetric: req.query.bypassMetric, component: req.component }

        const response = await resolveCriteria(req.config, context, 'values description strategy operation activated -_id')

        if (response) {
            delete response.domain
            delete response.group

            if (!req.query.showReason) {
                delete response.reason
            }

            if (!req.query.showStrategy) {
                delete response.strategies
            }

            res.send(response)
        } else {
            res.status(500).send({ error: 'Something went wrong while executing the criteria validation' })
        }
    } catch (e) {
        res.status(500).send()
    }
})

router.post('/criteria/auth', appGenerateCredentials, async (req, res) => {
    try {
        const { exp } = jwt.decode(req.token)
        res.send({ token: req.token, exp })
    } catch (e) {
        res.status(400).send()
    }
})

export default router;