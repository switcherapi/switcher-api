import express from 'express';
import { auth } from '../middleware/auth';
import { check, validationResult } from 'express-validator';
import { Team, addDefaultRole } from '../models/team';
import { Role, checkActionType, ActionTypes, RouterTypes } from '../models/role';
import { verifyInputUpdateParameters } from '../middleware/validators';
import { verifyOwnership, PermissionError, NotFoundError, responseException } from './common/index';
import Admin from '../models/admin';
import Domain from '../models/domain';

const router = new express.Router()

router.post('/team/create', auth, [
    check('name').isLength({ min: 2, max: 50 })
], async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    }

    let team = new Team({
        ...req.body
    })

    try {
        team = await verifyOwnership(req.admin, team, team.domain, ActionTypes.CREATE, RouterTypes.ADMIN);

        if (req.query.defaultActions) {
            const actions = req.query.defaultActions.split(',');
            checkActionType(actions);
            for (let index = 0; index < actions.length; index++) {
                await addDefaultRole(actions[index], team);
            }
        }

        await team.save()
        res.status(201).send(team)
    } catch (e) {
        responseException(res, e, 400)
    }
})

// GET /team?domain=ID&limit=10&skip=20
// GET /team?domain=ID&sort=desc
// GET /team?domain=ID
router.get('/team', auth, async (req, res) => {
    if (!req.query.domain) {
        return res.status(500).send({
            error: 'Please, specify the \'domain\' id'
        })
    }

    try {
        let teams = await Team.find({ domain: req.query.domain }, null,
            {
                skip: parseInt(req.query.skip),
                limit: parseInt(req.query.limit),
                sort: {
                    name: req.query.sort === 'desc' ? -1 : 1
                }
            }).lean()

        teams = await verifyOwnership(req.admin, teams, req.query.domain, ActionTypes.READ, RouterTypes.ADMIN)

        res.send(teams)
    } catch (e) {
        responseException(res, e, 400)
    }
})

router.get('/team/:id', auth, async (req, res) => {
    try {
        let team = await Team.findById(req.params.id).lean()

        if (!team) {
            return res.status(404).send()
        }

        team = await verifyOwnership(req.admin, team, team.domain, ActionTypes.READ, RouterTypes.ADMIN)

        res.send(team)
    } catch (e) {
        responseException(res, e, 400)
    }
})

router.patch('/team/:id', auth, verifyInputUpdateParameters(['name', 'active']), async (req, res) => {
    try {
        let team = await Team.findById(req.params.id)
 
        if (!team) {
            return res.status(404).send()
        }

        team = await verifyOwnership(req.admin, team, team.domain, ActionTypes.UPDATE, RouterTypes.ADMIN)

        req.updates.forEach((update) => team[update] = req.body[update])
        await team.save()
        res.send(team)
    } catch (e) {
        responseException(res, e, 400)
    }
})

router.delete('/team/:id', auth, async (req, res) => {
    try {
        let team = await Team.findById(req.params.id)

        if (!team) {
            return res.status(404).send()
        }

        team = await verifyOwnership(req.admin, team, team.domain, ActionTypes.DELETE, RouterTypes.ADMIN)

        await team.remove()
        res.send(team)
    } catch (e) {
        responseException(res, e, 400)
    }
})

router.patch('/team/member/add/:id', auth, verifyInputUpdateParameters(['member']), async (req, res) => {
    try {
        let team = await Team.findById(req.params.id)
        
        if (!team) {
            return res.status(404).send({ error: 'Team not found' })
        }

        team = await verifyOwnership(req.admin, team, team.domain, ActionTypes.UPDATE, RouterTypes.ADMIN)

        const member = req.body.member.trim()
        const admin = await Admin.findById(member);

        if (!admin) {
            return res.status(404).send({ error: 'Member not found' })
        }

        if (admin.teams.includes(team._id)) {
            return res.status(400).send({ error: `Member '${admin.name}' already joined in '${team.name}'` })
        }

        admin.teams.push(team._id);
        await admin.save()
        res.send(admin)
    } catch (e) {
        responseException(res, e, 400)
    }
})

router.patch('/team/member/remove/:id', auth, verifyInputUpdateParameters(['member']), async (req, res) => {
    try {
        let team = await Team.findById(req.params.id)
            
        if (!team) {
            return res.status(404).send({ error: 'Team not found' })
        }

        team = await verifyOwnership(req.admin, team, team.domain, ActionTypes.UPDATE, RouterTypes.ADMIN)

        const member = req.body.member.trim()
        const admin = await Admin.findById(member);

        if (!admin) {
            return res.status(404).send({ error: 'Member not found' })
        }

        const indexTeam = admin.teams.indexOf(team._id)

        if (indexTeam < 0) {
            return res.status(404).send({ error: `Member '${admin.name}' does not belong to '${team.name}'` })
        }

        admin.teams.splice(indexTeam)
        await admin.save()
        res.send(admin)
    } catch (e) {
        responseException(res, e, 400)
    }
})

router.patch('/team/role/add/:id', auth, verifyInputUpdateParameters(['role']), async (req, res) => {
    try {
        let team = await Team.findById(req.params.id)
        
        if (!team) {
            return res.status(404).send({ error: 'Team not found' })
        }

        team = await verifyOwnership(req.admin, team, team.domain, ActionTypes.UPDATE, RouterTypes.ADMIN)

        const role = await Role.findById(req.body.role)
        
        if (!role) {
            return res.status(404).send({ error: 'Role not found' })
        }
        
        if (team.roles.includes(role._id)) {
            return res.status(400).send({ error: `Role '${role._id}' already exist` })
        }

        team.roles.push(role._id)
        await team.save()
        res.send(team)
    } catch (e) {
        responseException(res, e, 400)
    }
})

router.patch('/team/role/remove/:id', auth, verifyInputUpdateParameters(['role']), async (req, res) => {
    try {
        let team = await Team.findById(req.params.id)
            
        if (!team) {
            return res.status(404).send({ error: 'Team not found' })
        }

        team = await verifyOwnership(req.admin, team, team.domain, ActionTypes.UPDATE, RouterTypes.ADMIN)

        const role = await Role.findById(req.body.role.trim())
        
        if (!role) {
            return res.status(404).send({ error: 'Role not found' })
        }

        const indexRoles = team.roles.indexOf(role._id)

        if (indexRoles < 0) {
            return res.status(404).send({ error: `Role '${role._id}' does not exist` })
        }

        await Role.deleteOne({ _id: req.body.role });
        team.roles.splice(indexRoles)
        await team.save()
        res.send(team)
    } catch (e) {
        responseException(res, e, 400)
    }
})

export default router;