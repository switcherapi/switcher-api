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