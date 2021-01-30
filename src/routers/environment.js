import express from 'express';
import { check, query } from 'express-validator';
import { Environment, EnvType } from '../models/environment';
import GroupConfig from '../models/group-config';
import { Config } from '../models/config';
import Domain from '../models/domain';
import { ConfigStrategy } from '../models/config-strategy';
import { auth } from '../middleware/auth';
import { 
    removeDomainStatus,
    removeGroupStatus,
    removeConfigStatus,
    verifyOwnership,
    formatInput
} from './common/index';
import { ActionTypes, RouterTypes } from '../models/role';
import { checkEnvironment } from '../external/switcher-api-facade';
import { responseException } from '../exceptions';
import { validate } from '../middleware/validators';

const router = new express.Router();

async function removeEnvironmentFromElements(environment) {
    await ConfigStrategy.deleteMany({ domain: environment.domain, $or: [ 
        { activated: { [`${environment.name}`]: true } }, 
        { activated: { [`${environment.name}`]: false } } 
    ] });

    const configs = await Config.find({ domain: environment.domain });
    if (configs.length) {
        configs.forEach(async function(config) {
            await removeConfigStatus(config, environment.name);
        });
    }

    const groupConfigs = await GroupConfig.find({ domain: environment.domain });
    if (groupConfigs.length) {
        groupConfigs.forEach(async function(group) {
            await removeGroupStatus(group, environment.name);
        });
    }

    const domain = await Domain.findById(environment.domain);
    
    await removeDomainStatus(domain, environment.name);
}

router.post('/environment/create', auth, async (req, res) => {
    let environment = new Environment({
        ...req.body, 
        owner: req.admin._id
    });

    try {
        await checkEnvironment(req.body.domain);
        environment.name = formatInput(environment.name);
        environment = await verifyOwnership(req.admin, environment, environment.domain, ActionTypes.CREATE, RouterTypes.ENVIRONMENT);

        await environment.save();
        res.status(201).send(environment);
    } catch (e) {
        responseException(res, e, 400);
    }
});

// GET /environment?domain=ID&limit=10&skip=20
// GET /environment?domain=ID&sort=desc
// GET /environment?domain=ID
router.get('/environment', [query('domain', 'Please, specify the \'domain\' id').isMongoId()], 
    validate, auth, async (req, res) => {
    try {
        let environments = await Environment.find({ domain: req.query.domain },
            ['_id', 'name'],
            {
                skip: parseInt(req.query.skip),
                limit: parseInt(req.query.limit),
                sort: {
                    name: req.query.sort === 'desc' ? -1 : 1
                }
            });

        res.send(environments);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.get('/environment/:id', [check('id', 'Invalid Id for environment').isMongoId()], 
    validate, auth, async (req, res) => {
    try {
        let environment = await Environment.findById(req.params.id);

        if (!environment) {
            return res.status(404).send();
        }

        res.send(environment);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.delete('/environment/:id', [check('id', 'Invalid Id for environment').isMongoId()], 
    validate, auth, async (req, res) => {
    try {
        let environment = await Environment.findById(req.params.id);

        if (!environment) {
            return res.status(404).send();
        }

        if (environment.name === EnvType.DEFAULT) {
            return res.status(400).send({ error: 'Unable to delete this environment' });
        }

        environment = await verifyOwnership(req.admin, environment, environment.domain, ActionTypes.DELETE, RouterTypes.ENVIRONMENT);

        await removeEnvironmentFromElements(environment);
        
        await environment.remove();
        res.send(environment);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.patch('/environment/recover/:id', [check('id', 'Invalid Id for environment').isMongoId()], 
    validate, auth, async (req, res) => {
    try {
        let environment = await Environment.findById(req.params.id);

        if (!environment) {
            return res.status(404).send();
        }

        environment = await verifyOwnership(req.admin, environment, environment.domain, ActionTypes.UPDATE, RouterTypes.ENVIRONMENT);

        await removeEnvironmentFromElements(environment);

        res.send({ message: `Environment '${environment.name}' recovered` });
    } catch (e) {
        responseException(res, e, 400);
    }
});

export default router;