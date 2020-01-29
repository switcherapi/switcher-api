import express from 'express';
import { Environment, EnvType } from '../models/environment';
import GroupConfig from '../models/group-config';
import Config from '../models/config';
import Domain from '../models/domain';
import { ConfigStrategy } from '../models/config-strategy';
import { auth } from '../middleware/auth';
import { 
    removeDomainStatus,
    removeGroupStatus,
    removeConfigStatus,
    verifyOwnership,
    responseException
} from './common/index'
import { ActionTypes, RouterTypes } from '../models/role';

const router = new express.Router()

async function removeEnvironmentFromElements(environment) {
    await ConfigStrategy.deleteMany({ domain: environment.domain, $or: [ 
        { activated: { [`${environment.name}`]: true } }, 
        { activated: { [`${environment.name}`]: false } } 
    ] })

    const configs = await Config.find({ domain: environment.domain })
    if (configs.length) {
        configs.forEach(async function(config) {
            await removeConfigStatus(config, environment.name)
        })
    }

    const groupConfigs = await GroupConfig.find({ domain: environment.domain })
    if (groupConfigs.length) {
        groupConfigs.forEach(async function(group) {
            await removeGroupStatus(group, environment.name)
        })
    }

    const domain = await Domain.findById(environment.domain)
    
    await removeDomainStatus(domain, environment.name)
}

router.post('/environment/create', auth, async (req, res) => {
    let environment = new Environment({
        ...req.body, 
        owner: req.admin._id
    })

    try {
        environment = await verifyOwnership(req.admin, environment, environment.domain, ActionTypes.CREATE, RouterTypes.ENVIRONMENT)

        await environment.save()
        res.status(201).send(environment)
    } catch (e) {
        responseException(res, e, 400)
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
        let environments = await Environment.find({ domain: req.query.domain },
            ['_id', 'name'],
            {
                skip: parseInt(req.query.skip),
                limit: parseInt(req.query.limit),
                sort: {
                    name: req.query.sort === 'desc' ? -1 : 1
                }
            })

        environments = await verifyOwnership(req.admin, environments, req.query.domain, ActionTypes.READ, RouterTypes.ENVIRONMENT)

        res.send(environments)
    } catch (e) {
        responseException(res, e, 500)
    }
})

router.get('/environment/:id', auth, async (req, res) => {
    try {
        let environment = await Environment.findById(req.params.id)

        if (!environment) {
            return res.status(404).send()
        }

        environment = await verifyOwnership(req.admin, environment, environment.domain, ActionTypes.READ, RouterTypes.ENVIRONMENT)

        res.send(environment)
    } catch (e) {
        responseException(res, e, 400)
    }
})

router.delete('/environment/:id', auth, async (req, res) => {
    try {
        let environment = await Environment.findById(req.params.id)

        if (!environment) {
            return res.status(404).send()
        }

        if (environment.name === EnvType.DEFAULT) {
            return res.status(400).send({ error: 'Unable to delete this environment' })
        }

        environment = await verifyOwnership(req.admin, environment, environment.domain, ActionTypes.DELETE, RouterTypes.ENVIRONMENT)

        await removeEnvironmentFromElements(environment)
        
        await environment.remove()
        res.send(environment)
    } catch (e) {
        responseException(res, e, 400)
    }
})

router.patch('/environment/recover/:id', auth, async (req, res) => {
    try {
        let environment = await Environment.findById(req.params.id)

        if (!environment) {
            return res.status(404).send()
        }

        environment = await verifyOwnership(req.admin, environment, environment.domain, ActionTypes.UPDATE, RouterTypes.ENVIRONMENT)

        await removeEnvironmentFromElements(environment)

        res.send({ message: `Environment '${environment.name}' recovered` })
    } catch (e) {
        responseException(res, e, 400)
    }
})

export default router;