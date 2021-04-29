import express from 'express';
import { Metric } from '../models/metric';
import { getConfig } from '../controller/config';
import { check } from 'express-validator';
import { auth } from '../middleware/auth';
import { verifyOwnership } from './common/index';
import { ActionTypes, RouterTypes } from '../models/role';
import { responseException } from '../exceptions';
import { 
    aggreagateReasons, 
    aggregateComponents, 
    aggregateSwitchers, 
    buildMetricsFilter 
} from '../controller/metric';
import { validate } from '../middleware/validators';

const router = new express.Router();

// GET /metric/data/ID??key=&component=&result=&group=&dateBefore=&dateAfter=
// GET /metric/data/ID?sortBy=-date;key;component;result
// GET /metric/data/ID?page=1
router.get('/metric/data/', [
    check('domainid').isMongoId(), 
    check('page', 'page is required as query parameter').isLength({ min: 1 })
], validate, auth, async (req, res) => {
    try {
        let { args } = buildMetricsFilter(req);
        
        if (req.query.key) { 
            const config = await getConfig({ domain: req.query.domainid, key: req.query.key });
            if (config) {
                args.config = config._id;
            } else {
                return res.send();
            }
        }

        if (isNaN(req.query.page)) {
            throw new Error('Page value should be a number');
        }

        const skip = parseInt((process.env.METRICS_MAX_PAGE * parseInt(req.query.page)) - process.env.METRICS_MAX_PAGE);
        const metrics = await Metric.find({ ...args }, 
            'config component entry result reason message group environment date -_id', {
                skip,
                limit: parseInt(process.env.METRICS_MAX_PAGE)
            }).sort(req.query.sortBy ? req.query.sortBy.replace(';', ' ') : 'date')
            .populate({ path: 'config', select: 'key -_id' }).exec();

        res.send({
            page: req.query.page,
            data: metrics
        });
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.get('/metric/statistics/', [
    check('domainid').isMongoId(),
    check('statistics', 'add one or more options {swicthers,components,reasons,all} separed by comma').isLength({ min: 3 })
], validate, auth, async (req, res) => {
    try {
        const { aggregatorFilter } = buildMetricsFilter(req);
        const dateGroupPattern =  req.query.dateGroupPattern ? 
            req.query.dateGroupPattern : 'YYYY-MM';

        if (req.query.key) { 
            const config = await getConfig({ domain: req.query.domainid, key: req.query.key });
            if (config) {
                aggregatorFilter.$match.$expr.$and.push({ $eq: ['$config', config._id] });
            } else {
                return res.send();
            }
        }

        let result = {};
        await Promise.all([
            req.query.statistics.match(/(switchers)|(all)/) ?
                aggregateSwitchers(aggregatorFilter, dateGroupPattern, result) : Promise.resolve(),
            req.query.statistics.match(/(components)|(all)/) ?
                aggregateComponents(aggregatorFilter, dateGroupPattern, result) : Promise.resolve(),
            req.query.statistics.match(/(reasons)|(all)/) ?
                aggreagateReasons(aggregatorFilter, result) : Promise.resolve()
        ]);

        res.send(result);
    } catch (e) {
        responseException(res, e, 500);
    }

});

router.delete('/metric', [
    check('domainid').isMongoId(),
    check('key', 'switcher key must be provided').isLength({ min: 1 })
], validate, auth, async (req, res) => {
    try {
        let config = await getConfig({ domain: req.query.domainid, key: req.query.key });
        if (!config) {
            return res.status(404).send();
        }

        config = await verifyOwnership(req.admin, config, config.domain, ActionTypes.DELETE, RouterTypes.ADMIN);

        await Metric.deleteMany({ domain: config.domain, config: config._id });
        res.send({ message: 'Switcher metrics deleted' });
    } catch (e) {
        responseException(res, e, 500);
    }
});

export default router;