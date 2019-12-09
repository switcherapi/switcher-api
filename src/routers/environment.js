import express from 'express';
import { Environment, EnvType } from '../models/environment';
import { auth } from '../middleware/auth';
import { masterPermission } from '../middleware/validators';

const router = new express.Router()

router.post('/environment/create', auth, masterPermission('create Environments'), async (req, res) => {
    const environment = new Environment({
        ...req.body, 
        owner: req.admin._id
    })

    try {
        await environment.save()
        res.status(201).send(environment)
    } catch (e) {
        res.status(400).send({ error: e.message })
    }
})

// GET /environment?domain=ID&limit=10&skip=20
// GET /environment?domain=ID&sort=desc
// GET /environment?domain=ID
router.get("/environment", auth, async (req, res) => {
    if (!req.query.domain) {
        return res.status(500).send({
            error: 'Please, specify the \'domain\' id'
        })
    }

    try {
        const environments = await Environment.find({ domain: req.query.domain },
            ['_id', 'name'],
            {
                skip: parseInt(req.query.skip),
                limit: parseInt(req.query.limit),
                sort: {
                    name: req.query.sort === 'desc' ? -1 : 1
                }
            })

        res.send(environments)
    } catch (e) {
        res.status(500).send()
    }
})

router.get('/environment/:id', auth, async (req, res) => {
    try {
        const environment = await Environment.findOne({ _id: req.params.id })

        if (!environment) {
            return res.status(404).send()
        }

        res.send(environment)
    } catch (e) {
        res.status(404).send()
    }
})

router.delete('/environment/:id', auth, masterPermission('delete Environments'), async (req, res) => {
    try {
        const environment = await Environment.findById(req.params.id)

        if (!environment) {
            return res.status(404).send()
        }

        if (environment.name === EnvType.DEFAULT) {
            return res.status(400).send({ error: 'Unable to delete this environment' })
        }

        try {
            await environment.remove()
            res.send(environment)
        } catch (e) {
            return res.status(500).send()
        }
    } catch (e) {
        res.status(404).send()
    }
})

export default router;