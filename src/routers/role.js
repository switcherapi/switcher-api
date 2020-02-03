import express from 'express';
import { auth } from '../middleware/auth';
import { Role, RouterTypes, ActionTypes, getKeysByRouter } from '../models/role';
import { Team } from '../models/team';
import { verifyInputUpdateParameters } from '../middleware/validators';
import { NotFoundError, responseException, verifyOwnership } from './common';

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

async function verifyRequestedTeam(teamId, admin, action) {
    let team = await Team.findById(teamId)
        
    if (!team) {
        throw new NotFoundError('Team not found')
    }

    return await verifyOwnership(admin, team, team.domain, action, RouterTypes.ADMIN);
}

async function verifyRequestedTeamByRole(roleId, admin, action) {
    let team = await Team.find({ roles: roleId })
    return await verifyOwnership(admin, team[0], team[0].domain, action, RouterTypes.ADMIN);
}

router.post('/role/create/:team', auth, async (req, res) => {
    const role = new Role({
        ...req.body
    })

    try {
        await role.save()

        const team = await verifyRequestedTeam(req.params.team, req.admin, ActionTypes.CREATE)
        team.roles.push(role._id)
        await team.save()

        res.status(201).send(role)
    } catch (e) {
        responseException(res, e, 400)
    }
})

router.get('/role/routers', auth, (req, res) => {
    res.send({
        routersAvailable: Object.values(RouterTypes)
    })
})

router.get('/role/spec/router/:router', auth, (req, res) => {
    try {
        const result = getKeysByRouter(req.params.router, res)
        res.send(result)
    } catch (e) {
        responseException(res, e, 500)
    }
})

router.get('/role/actions', auth, (req, res) => {
    res.send({
        actionsAvailable: Object.values(ActionTypes)
    })
})

// GET /role?team=ID
router.get('/role', auth, async (req, res) => {
    if (!req.query.team) {
        return res.status(500).send({
            error: 'Please, specify the \'team\' id'
        })
    }

    try {
        let team = await Team.findById(req.query.team)

        if (!team) {
            return res.status(404).send() 
        }
        
        await verifyOwnership(req.admin, team, team.domain, ActionTypes.READ, RouterTypes.ADMIN);
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

        await verifyRequestedTeamByRole(role._id, req.admin, ActionTypes.UPDATE)
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

        await verifyRequestedTeamByRole(role._id, req.admin, ActionTypes.DELETE)

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
        await verifyRequestedTeamByRole(role._id, req.admin, ActionTypes.UPDATE)

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
        await verifyRequestedTeamByRole(role._id, req.admin, ActionTypes.UPDATE)

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

router.patch('/role/updateValues/:id', auth, async (req, res) => {
    try {
        const role = await Role.findById(req.params.id)
        
        if (!role) {
            return res.status(404).send()
        }

        await verifyRequestedTeamByRole(role._id, req.admin, ActionTypes.UPDATE)

        role.values = req.body.values
        await role.save()
        res.send(role)
    } catch (e) {
        responseException(res, e, 400)
    }
})

export default router;