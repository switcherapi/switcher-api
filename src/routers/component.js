import express from 'express';
import { auth, authRefresh } from '../middleware/auth';
import { masterPermission } from '../middleware/validators';
import { check, validationResult } from 'express-validator';
import Component from '../models/component';

const router = new express.Router()

router.post('/component/create', auth, authRefresh(), [
    check('name').isLength({ min: 2, max: 50 }),
    check('description').isLength({ min: 2, max: 500 })
], masterPermission('create Components'), async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    }

    const component = new Component({
        ...req.body,
        owner: req.admin._id
    })

    try {
        await component.save()
        res.status(201).send(component)
    } catch (e) {
        res.status(400).send({ error: e.message })
    }
})

// GET /component?domain=ID&limit=10&skip=20
// GET /component?domain=ID&sort=desc
// GET /component?domain=ID
router.get("/component", auth, authRefresh(), async (req, res) => {
    if (!req.query.domain) {
        return res.status(500).send({
            error: 'Please, specify the \'domain\' id'
        })
    }

    try {
        const components = await Component.find({ domain: req.query.domain },
            ['_id', 'name', 'description'],
            {
                skip: parseInt(req.query.skip),
                limit: parseInt(req.query.limit),
                sort: {
                    name: req.query.sort === 'desc' ? -1 : 1
                }
            })

        res.send(components)
    } catch (e) {
        res.status(500).send()
    }
})

router.get('/component/:id', auth, authRefresh(), async (req, res) => {
    try {
        const component = await Component.findOne({ _id: req.params.id })

        if (!component) {
            return res.status(404).send()
        }

        res.send(component)
    } catch (e) {
        res.status(404).send()
    }
})

router.patch('/component/:id', [
    check('description').isLength({ min: 5, max: 500 })
], auth, authRefresh(), async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    }

    const updates = Object.keys(req.body)
    const allowedUpdates = ['description']
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update))

    if (!isValidOperation) {
        return res.status(400).send({ error: 'Invalid updates' })
    }

    try {
        const component = await Component.findOne({ _id: req.params.id })
 
        if (!component) {
            return res.status(404).send()
        }

        updates.forEach((update) => component[update] = req.body[update])
        await component.save()
        res.send(component)
    } catch (e) {
        res.status(400).send({ error: e.message })
    }
})

router.delete('/component/:id', auth, authRefresh(), masterPermission('delete Components'), async (req, res) => {
    try {
        const component = await Component.findById(req.params.id)
        
        await component.remove()
        res.send(component)
    } catch (e) {
        res.status(404).send()
    }
})

export default router;