import express from 'express';
import { auth } from '../middleware/auth';
import { verifyOwnership, responseException } from './common/index';
import { verifyInputUpdateParameters } from '../middleware/validators';
import { check, validationResult } from 'express-validator';
import Component from '../models/component';
import { ActionTypes, RouterTypes } from '../models/role';

const router = new express.Router()

router.post('/component/create', auth, [
    check('name').isLength({ min: 2, max: 50 }),
    check('description').isLength({ min: 2, max: 500 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    }

    let component = new Component({
        ...req.body,
        owner: req.admin._id
    })

    try {
        component = await verifyOwnership(req.admin, component, req.body.domain, ActionTypes.CREATE, RouterTypes.COMPONENT);

        await component.save()
        res.status(201).send(component)
    } catch (e) {
        responseException(res, e, 400);
    }
})

// GET /component?domain=ID&limit=10&skip=20
// GET /component?domain=ID&sort=desc
// GET /component?domain=ID
router.get('/component', auth, async (req, res) => {
    if (!req.query.domain) {
        return res.status(400).send({
            error: 'Please, specify the \'domain\' id'
        })
    }

    try {
        let components = await Component.find({ domain: req.query.domain },
            ['_id', 'name', 'description'],
            {
                skip: parseInt(req.query.skip),
                limit: parseInt(req.query.limit),
                sort: {
                    name: req.query.sort === 'desc' ? -1 : 1
                }
            })

        components = await verifyOwnership(req.admin, components, req.query.domain, ActionTypes.READ, RouterTypes.COMPONENT);

        res.send(components)
    } catch (e) {
        responseException(res, e, 500);
    }
})

router.get('/component/:id', auth, async (req, res) => {
    try {
        let component = await Component.findById(req.params.id)

        if (!component) {
            return res.status(404).send()
        }

        component = await verifyOwnership(req.admin, component, component.domain, ActionTypes.READ, RouterTypes.COMPONENT);

        res.send(component)
    } catch (e) {
        responseException(res, e, 400);
    }
})

router.patch('/component/:id', auth, verifyInputUpdateParameters(['name', 'description']), async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    }

    try {
        let component = await Component.findById(req.params.id)
 
        if (!component) {
            return res.status(404).send()
        }

        component = await verifyOwnership(req.admin, component, component.domain, ActionTypes.UPDATE, RouterTypes.COMPONENT);

        req.updates.forEach((update) => component[update] = req.body[update])
        await component.save()
        res.send(component)
    } catch (e) {
        responseException(res, e, 400);
    }
})

router.delete('/component/:id', auth, async (req, res) => {
    try {
        let component = await Component.findById(req.params.id)

        if (!component) {
            return res.status(404).send()
        }

        component = await verifyOwnership(req.admin, component, component.domain, ActionTypes.DELETE, RouterTypes.COMPONENT);

        await component.remove()
        res.send(component)
    } catch (e) {
        responseException(res, e, 400);
    }
})

export default router;