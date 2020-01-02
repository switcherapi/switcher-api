import express from 'express';
import { auth } from '../middleware/auth';
import { Role } from '../models/role';
import { Team } from '../models/team';
import { verifyInputUpdateParameters } from '../middleware/validators';
import { NotFoundError, responseException } from './common';

const router = new express.Router()

async function verifyRoleValueInput(roleId, value) {
    const role = await Role.findById(roleId)
            
    if (!role) {
        throw new NotFoundError('Role not found');
    }

    if (!value) {
        throw new Error('The attribute \'value\' must be assigned')
    }

    return role;
}

router.post('/role/create', auth, async (req, res) => {
    const role = new Role({
        ...req.body
    })

    try {
        await role.save()
        res.status(201).send(role)
    } catch (e) {
        res.status(400).send({ error: e.message })
    }
})

// GET /role?team=ID
router.get('/role', auth, async (req, res) => {
    if (!req.query.team) {
        return res.status(500).send({
            error: 'Please, specify the \'team\' id'
        })
    }

    try {
        const team = await Team.findById(req.query.team)

        if (!team) {
            return res.status(404).send() 
        }

        const roles = await Role.find({ _id: { $in: team.roles } }).lean()

        res.send(roles)
    } catch (e) {
        res.status(400).send()
    }
})

router.get('/role/:id', auth, async (req, res) => {
    try {
        const role = await Role.findById(req.params.id).lean()

        if (!role) {
            return res.status(404).send()
        }

        res.send(role)
    } catch (e) {
        res.status(400).send()
    }
})

router.patch('/role/:id', auth, 
    verifyInputUpdateParameters(['action', 'active', 'router', 'identifiedBy']), async (req, res) => {
    try {
        const role = await Role.findById(req.params.id)
 
        if (!role) {
            return res.status(404).send()
        }

        req.updates.forEach((update) => role[update] = req.body[update])
        await role.save()
        res.send(role)
    } catch (e) {
        res.status(400).send({ error: e.message })
    }
})

router.delete('/role/:id', auth, async (req, res) => {
    try {
        const role = await Role.findById(req.params.id)

        if (!role) {
            return res.status(404).send()
        }

        const teams = await Team.find({ roles: role._id })
        teams.forEach(team => {
            const indexValue = team.roles.indexOf(team._id)
            team.roles.splice(indexValue)
            team.save()
        })
        
        await role.remove()
        res.send(role)
    } catch (e) {
        res.status(400).send()
    }
})

router.patch('/role/value/add/:id', auth, verifyInputUpdateParameters(['value']), async (req, res) => {
    try {
        const role = await verifyRoleValueInput(req.params.id, req.body.value)

        const value = req.body.value.trim()
        if (role.values.includes(value)) {
            return res.status(400).send({ error: `Value '${value}' already exist` })
        }

        role.values.push(value)
        await role.save()
        res.send(role)
    } catch (e) {
        responseException(res, e, 400)
    }
})

router.patch('/role/value/remove/:id', auth, verifyInputUpdateParameters(['value']), async (req, res) => {
    try {
        const role = await verifyRoleValueInput(req.params.id, req.body.value)

        const value = req.body.value.trim()
        const indexValue = role.values.indexOf(value)

        if (indexValue < 0) {
            return res.status(404).send({ error: `Value '${value}' does not exist` })
        }

        role.values.splice(indexValue)
        await role.save()
        res.send(role)
    } catch (e) {
        responseException(res, e, 400)
    }
})

export default router;