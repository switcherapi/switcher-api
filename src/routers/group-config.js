import express from 'express';
import Domain from '../models/domain';
import GroupConfig from '../models/group-config';
import { auth } from '../middleware/auth';
import { checkEnvironmentStatusChange, verifyInputUpdateParameters } from '../middleware/validators';
import { removeGroupStatus, verifyOwnership, responseException, NotFoundError } from './common/index'
import { ActionTypes, RouterTypes } from '../models/role';

const router = new express.Router()

async function verifyGroupInput(groupId, admin) {
    let groupconfig = await GroupConfig.findById(groupId)
        
    if (!groupconfig) {
        throw new NotFoundError('GroupConfig does not exist')
    }

    return await verifyOwnership(admin, groupconfig, groupconfig.domain, ActionTypes.UPDATE, RouterTypes.GROUP)
}

router.post('/groupconfig/create', auth, async (req, res) => {
    let groupconfig = new GroupConfig({
        ...req.body,
        owner: req.admin._id
    })

    try {
        const domain = await Domain.findById(req.body.domain)

        if (!domain) {
            return res.status(404).send({ error: 'Domain not found' })
        }

        groupconfig = await verifyOwnership(req.admin, groupconfig, domain._id, ActionTypes.CREATE, RouterTypes.GROUP)

        await groupconfig.save()
        res.status(201).send(groupconfig)
    } catch (e) {
        responseException(res, e, 500)
    }
})

// GET /groupconfig?limit=10&skip=20
// GET /groupconfig?sortBy=createdAt:desc
// GET /groupconfig?domain=ID
router.get('/groupconfig', auth, async (req, res) => {
    const sort = {}

    if (req.query.sortBy) {
        const parts = req.query.sortBy.split(':')
        sort[parts[0]] = parts[1] === 'desc' ? -1 : 1
    }

    try {
        const domain = await Domain.findById(req.query.domain)

        if (!domain) {
            return res.status(404).send({ error: 'Domain not found' })
        }

        await domain.populate({
            path: 'groupConfig',
            options: {
                limit: parseInt(req.query.limit),
                skip: parseInt(req.query.skip),
                sort
            }
        }).execPopulate()

        let groups = domain.groupConfig;

        groups = await verifyOwnership(req.admin, groups, domain._id, ActionTypes.READ, RouterTypes.GROUP)

        res.send(groups)
    } catch (e) {
        responseException(res, e, 500)
    }
})

router.get('/groupconfig/:id', auth, async (req, res) => {
    try {
        let groupconfig = await GroupConfig.findById(req.params.id)

        if (!groupconfig) {
            return res.status(404).send({ error: 'Group not found' })
        }

        groupconfig = await verifyOwnership(req.admin, groupconfig, groupconfig.domain, ActionTypes.READ, RouterTypes.GROUP)

        res.send(groupconfig)
    } catch (e) {
        responseException(res, e, 500)
    }
})

// GET /groupconfig/ID?sortBy=createdAt:desc
// GET /groupconfig/ID?limit=10&skip=20
// GET /groupconfig/ID
router.get('/groupconfig/history/:id', auth, async (req, res) => {
    const sort = {}

    if (req.query.sortBy) {
        const parts = req.query.sortBy.split(':')
        sort[`${parts[0]}.${parts[1]}`] = parts[2] === 'desc' ? -1 : 1
    }

    try {
        const groupconfig = await GroupConfig.findById(req.params.id)

        if (!groupconfig) {
            return res.status(404).send()
        }

        await groupconfig.populate({
            path: 'history',
            select: 'oldValue newValue -_id',
            options: {
                limit: parseInt(req.query.limit),
                skip: parseInt(req.query.skip),
                sort
            }
        }).execPopulate()

        let history = groupconfig.history;

        history = await verifyOwnership(req.admin, history, groupconfig.domain, ActionTypes.READ, RouterTypes.GROUP)

        res.send(history)
    } catch (e) {
        responseException(res, e, 500)
    }
})

router.delete('/groupconfig/:id', auth, async (req, res) => {
    try {
        let groupconfig = await GroupConfig.findById(req.params.id)

        if (!groupconfig) {
            return res.status(404).send({ error: 'Group not found' })
        }

        groupconfig = await verifyOwnership(req.admin, groupconfig, groupconfig.domain, ActionTypes.DELETE, RouterTypes.GROUP)

        await groupconfig.remove()
        res.send(groupconfig)
    } catch (e) {
        responseException(res, e, 500)
    }
})

router.patch('/groupconfig/:id', auth, 
    verifyInputUpdateParameters(['name', 'description']), async (req, res) => {
    try {
        const groupconfig = await verifyGroupInput(req.params.id, req.admin)

        req.updates.forEach((update) => groupconfig[update] = req.body[update])
        await groupconfig.save()
        res.send(groupconfig)
    } catch (e) {
        responseException(res, e, 500)
    }
})

router.patch('/groupconfig/updateStatus/:id', auth, async (req, res) => {
    try {
        const groupconfig = await verifyGroupInput(req.params.id, req.admin)

        const updates = await checkEnvironmentStatusChange(req, res, groupconfig.domain)
        updates.forEach((update) => groupconfig.activated.set(update, req.body[update]))
        await groupconfig.save()
        res.send(groupconfig)
    } catch (e) {
        responseException(res, e, 500)
    }
})

router.patch('/groupconfig/removeStatus/:id', auth, async (req, res) => {
    try {
        const groupconfig = await verifyGroupInput(req.params.id, req.admin)

        res.send(await removeGroupStatus(groupconfig, req.body.env))
    } catch (e) {
        responseException(res, e, 400)
    }
})

export default router;