import express from 'express';
import Domain from '../models/domain';
import { auth } from '../middleware/auth';
import { masterPermission } from '../middleware/validators';

const router = new express.Router()

router.get('/domain/generateKey/:id', auth, masterPermission('generate Domain token'), async (req, res) => {
    try {
        const domain = await Domain.findOne({ _id: req.params.id })

        if (!domain) {
            return res.status(404).send()
        }

        const token = await domain.generateAuthToken()
        
        res.status(201).send({ token })
    } catch (e) {
        res.status(400).send(e)
    }
})

router.post('/domain/create', auth, masterPermission('create Domains'), async (req, res) => {
    try {
        const domain = new Domain({
            ...req.body,
            owner: req.admin._id
        })

        const token = await domain.generateAuthToken()
        domain.token = token
        await domain.save()
        res.status(201).send(domain)
    } catch (e) {
        res.status(400).send(e)
    }
})

// GET /domain?limit=10&skip=20
// GET /domain?sortBy=createdAt:desc
router.get("/domain", auth, async (req, res) => {
    const match = {}
    const sort = {}

    if (req.query.sortBy) {
        const parts = req.query.sortBy.split(':')
        sort[parts[0]] = parts[1] === 'desc' ? -1 : 1
    }

    try {
        await req.admin.populate({
            path: 'domain',
            match,
            options: {
                limit: parseInt(req.query.limit),
                skip: parseInt(req.query.skip),
                sort
            }
        }).execPopulate()
        res.send(req.admin.domain)
    } catch (e) {
        res.status(500).send()
    }
})

router.get('/domain/:id', auth, async (req, res) => {
    try {
        const domain = await Domain.findOne({ _id: req.params.id })

        if (!domain) {
            return res.status(404).send()
        }

        res.send(domain)
    } catch (e) {
        res.status(404).send()
    }
})

router.delete('/domain/:id', auth, masterPermission('delete Domain'), async (req, res) => {
    try {
        const domain = await Domain.findOne({ _id: req.params.id })

        if (!domain) {
            return res.status(404).send()
        }

        await domain.remove()
        res.send(domain)
    } catch (e) {
        console.log(e)
        res.status(500).send()
    }
})

router.patch('/domain/:id', auth, masterPermission('update Domain'), async (req, res) => {
    const updates = Object.keys(req.body)
    const allowedUpdates = ['name', 'description', 'token']
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update))

    if (!isValidOperation) {
        return res.status(400).send({ error: 'Invalid updates' })
    }

    try {
        const domain = await Domain.findOne({ _id: req.params.id })
        
        if (!domain) {
            return res.status(404).send()
        }

        updates.forEach((update) => domain[update] = req.body[update])
        await domain.save()
        res.send(domain)
    } catch (e) {
        res.status(400).send(e)
    }
})

export default router;