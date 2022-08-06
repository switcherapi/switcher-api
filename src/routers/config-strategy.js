import express from 'express';
import { check, query } from 'express-validator';
import History from '../models/history';
import { EnvType } from '../models/environment';
import { validate, verifyInputUpdateParameters } from '../middleware/validators';
import { strategyRequirements, StrategiesType } from '../models/config-strategy';
import { auth } from '../middleware/auth';
import { verifyOwnership, sortBy } from '../helpers';
import { ActionTypes, RouterTypes } from '../models/permission';
import { getConfigById } from '../services/config';
import * as Services from '../services/config-strategy';
import { responseException } from '../exceptions';

const router = new express.Router();

router.post('/configstrategy/create', auth, [
    check('description').isLength({ max: 256 })
], validate, async (req, res) => {
    try {
        const configStrategy = await Services.createStrategy(req.body, req.admin);
        res.status(201).send(configStrategy);
    } catch (e) {
        responseException(res, e, 400);
    }
});

// GET /configstrategy?limit=10&skip=20
// GET /configstrategy?sortBy=createdAt:desc
// GET /configstrategy?config=ID&env=QA
router.get('/configstrategy', auth, [
    query('config').isMongoId(),
    query('env').optional().isLength({ max: 30 })
], validate, async (req, res) => {
    try {
        const config = await getConfigById(req.query.config);

        await config.populate({
            path: 'configStrategy',
            options: {
                limit: parseInt(req.query.limit || 10),
                skip: parseInt(req.query.skip || 0),
                sort: sortBy(req.query)
            }
        });
        
        let configStrategies = config.configStrategy.filter(
            elements => elements.activated.get(req.query.env ? req.query.env : EnvType.DEFAULT) != undefined);

        configStrategies = await verifyOwnership(req.admin, configStrategies, config.domain, ActionTypes.READ, RouterTypes.STRATEGY, true);

        res.send(configStrategies);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.get('/configstrategy/:id', auth, [
    check('id').isMongoId()
], validate, async (req, res) => {
    try {
        let configStrategy = await Services.getStrategyById(req.params.id);
        configStrategy = await verifyOwnership(req.admin, configStrategy, configStrategy.domain, ActionTypes.READ, RouterTypes.STRATEGY);

        res.send(configStrategy);
    } catch (e) {
        responseException(res, e, 500);
    }
});

// GET /configstrategy/ID?sortBy=date:desc
// GET /configstrategy/ID?limit=10&skip=20
// GET /configstrategy/ID
router.get('/configstrategy/history/:id', auth, [
    check('id').isMongoId()
], validate, async (req, res) => {
    try {
        const configStrategy = await Services.getStrategyById(req.params.id);
        const history = await History.find({ domainId: configStrategy.domain, elementId: configStrategy._id })
            .select('oldValue newValue updatedBy date -_id')
            .sort(sortBy(req.query))
            .limit(parseInt(req.query.limit || 10))
            .skip(parseInt(req.query.skip || 0));

        await verifyOwnership(req.admin, configStrategy, configStrategy.domain, ActionTypes.READ, RouterTypes.STRATEGY);

        res.send(history);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.delete('/configstrategy/history/:id', auth, [
    check('id').isMongoId()
], validate, async (req, res) => {
    try {
        const configStrategy = await Services.getStrategyById(req.params.id);
        await verifyOwnership(req.admin, configStrategy, configStrategy.domain, ActionTypes.DELETE, RouterTypes.ADMIN);

        await History.deleteMany({ domainId: configStrategy.domain, elementId: configStrategy._id });
        res.send(configStrategy);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.get('/configstrategy/req/:strategy', auth, [
    check('strategy').isLength({ min: 1 })
], validate, (req, res) => {
    try {
        const strategy = req.params.strategy.toString();
        res.send(strategyRequirements(strategy));
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.get('/configstrategy/spec/strategies', auth, (_req, res) => {
    res.send({
        strategiesAvailable: Object.values(StrategiesType)
    });
});

router.delete('/configstrategy/:id', auth, [
    check('id').isMongoId()
], validate, async (req, res) => {
    try {
        const configStrategy = await Services.deleteStrategy(req.params.id, req.admin);
        res.send(configStrategy);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.patch('/configstrategy/:id', auth, verifyInputUpdateParameters([
    'description', 'values', 'operation'
]), [
    check('id').isMongoId()
], validate, async (req, res) => {
    try {
        const configStrategy = await Services.updateStrategy(req.params.id, req.body, req.admin);
        res.send(configStrategy);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.patch('/configstrategy/addval/:id', auth, [
    check('id').isMongoId()
], validate, verifyInputUpdateParameters(['value']), async (req, res) => {
    try {
        const configStrategy = await Services.addVal(req.params.id, req.body, req.admin);
        res.send(configStrategy);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.patch('/configstrategy/updateval/:id', auth, [
    check('id').isMongoId()
], validate, verifyInputUpdateParameters(['oldvalue', 'newvalue']), async (req, res) => {
    try {
        const configStrategy = await Services.updateVal(req.params.id, req.body, req.admin);
        res.send(configStrategy);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.patch('/configstrategy/removeval/:id', auth, [
    check('id').isMongoId()
], validate, verifyInputUpdateParameters(['value']),  async (req, res) => {
    try {
        const configStrategy = await Services.removeVal(req.params.id, req.body, req.admin);
        res.send(configStrategy);
    } catch (e) {
        responseException(res, e, 400);
    }
});

// GET /configstrategy/values:id?sort=true
// GET /configstrategy/values:id?limit=10&skip=20
router.get('/configstrategy/values/:id', auth, [
    check('id').isMongoId()
], validate, async (req, res) => {
    try {
        const configStrategy = await Services.getStrategyById(req.params.id);
        
        let values = configStrategy.values;
        if (req.query.sort === 'true') {
            values.sort();
        }

        if (req.query.limit) {
            values = values.slice(req.query.skip, req.query.limit);
        } else if (req.query.skip) {
            values = values.slice(req.query.skip, values.length);
        }

        values = await verifyOwnership(req.admin, values, configStrategy.domain, ActionTypes.READ, RouterTypes.STRATEGY);
        res.send(values);
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.patch('/configstrategy/updateStatus/:id', auth, [
    check('id').isMongoId()
], validate, async (req, res) => {
    try {
        const configStrategy = await Services.updateStatusEnv(req.params.id, req.body, req.admin);
        res.send(configStrategy);
    } catch (e) {
        responseException(res, e, 400);
    }
});

export default router;