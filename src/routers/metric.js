import express from 'express';
import { Metric } from '../models/metric';
import { getConfig } from '../services/config';
import { check } from 'express-validator';
import { auth } from '../middleware/auth';
import { verifyOwnership } from '../helpers';
import { ActionTypes, RouterTypes } from '../models/permission';
import { responseException } from '../exceptions';
import { 
    aggreagateReasons, 
    aggregateComponents, 
    aggregateSwitchers, 
    buildMetricsFilter 
} from '../services/metric';
import { validate } from '../middleware/validators';

const router = new express.Router();

// GET /metric/data/ID??key=&component=&result=&group=&dateBefore=&dateAfter=
// GET /metric/data/ID?sortBy=-date;key;component;result
// GET /metric/data/ID?page=1
router.get('/metric/data/', auth, [
    check('domainid').isMongoId(), 
    check('page', 'page is required as query parameter').isLength({ min: 1 })
], validate, async (req, res) => {
    try {
        let { args } = buildMetricsFilter(req);
        const page = req.query.page.toString();

        if (isNaN(page)) {
            throw new Error('Page value should be a number');
        }

        if (req.query.key) { 
            const config = await getConfig({ domain: req.query.domainid, key: req.query.key });
            if (config) {
                args.config = config._id;
            } else {
                return res.send();
            }
        }

        const skip = parseInt((process.env.METRICS_MAX_PAGE * parseInt(req.query.page)) - process.env.METRICS_MAX_PAGE);
        const metrics = await Metric.find({ ...args }, 
            'config component entry result reason message group environment date -_id', {
                skip,
                limit: parseInt(process.env.METRICS_MAX_PAGE)
            }).sort(req.query.sortBy ? req.query.sortBy.replace(';', ' ') : 'date')
            .populate({ path: 'config', select: 'key -_id' }).exec();

        res.send({
            page,
            data: metrics
        });
    } catch (e) {
        responseException(res, e, 500);
    }
});

router.get('/metric/statistics/', auth, [
    check('domainid').isMongoId(),
    check('statistics', 'add one or more options {swicthers,components,reasons,all} separed by comma').isLength({ min: 3 })
], validate, async (req, res) => {
    try {
        const switcher = buildMetricsFilter(req);
        const components = buildMetricsFilter(req);
        const reasons = buildMetricsFilter(req);

        const dateGroupPattern =  req.query.dateGroupPattern ? 
            req.query.dateGroupPattern : 'YYYY-MM';

        if (req.query.key) { 
            const config = await getConfig({ domain: req.query.domainid, key: req.query.key });
            if (config) {
                const switcherId = { config: config._id };
                switcher.aggregate.match(switcherId);
                components.aggregate.match(switcherId);
                reasons.aggregate.match(switcherId);
            } else {
                return res.send();
            }
        }

        let result = {};
        await Promise.all([
            req.query.statistics.match(/(switchers)|(all)/) ?
                aggregateSwitchers(switcher.aggregate, dateGroupPattern, result) : Promise.resolve(),
            req.query.statistics.match(/(components)|(all)/) ?
                aggregateComponents(components.aggregate, dateGroupPattern, result) : Promise.resolve(),
            req.query.statistics.match(/(reasons)|(all)/) ?
                aggreagateReasons(reasons.aggregate, result) : Promise.resolve()
        ]);

        res.send(result);
    } catch (e) {
        responseException(res, e, 500);
    }

});

router.delete('/metric', auth, [
    check('domainid').isMongoId(),
    check('key', 'switcher key must be provided').isLength({ min: 1 })
], validate, async (req, res) => {
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