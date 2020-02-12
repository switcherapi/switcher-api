import express from 'express';
import { Metric } from '../models/metric';
import { check, validationResult } from 'express-validator';
import { auth } from '../middleware/auth';
import { EnvType } from '../models/environment';
import Config from '../models/config';
import { groupCount, groupByDate, verifyOwnership, responseException } from './common/index';
import { ActionTypes, RouterTypes } from '../models/role';

const router = new express.Router();

function getStatistics(metrics, dateGroupPattern) {
    const results = metrics.filter(metric => metric.result)

    const reasonsFromMetrics = metrics.map(metric => metric.reason);
    const reasonsGrouped = groupCount(reasonsFromMetrics, 'reason');

    const switcherFromMetrics = metrics.map(metric => metric.config.key);
    const switchersGrouped = groupCount(switcherFromMetrics, 'switcher');

    const componentsFromMetrics = metrics.map(metric => metric.component);
    const componentsGrouped = groupCount(componentsFromMetrics, 'component');

    switchersGrouped.forEach(switcher => {
        const switcherMetrics = metrics.filter(metric => metric.config.key === switcher.switcher);
        const positiveMetrics = switcherMetrics.filter(switcherM => switcherM.result);
        
        switcher.positive = positiveMetrics.length;
        switcher.negative = switcherMetrics.length - positiveMetrics.length;

        //Date Pattern: YYYY-MM-DD HH:mm
        if (dateGroupPattern) {
            const switchersByDateTimeMetrics = groupByDate(metrics, ['config', 'key'], switcher.switcher, dateGroupPattern);
            switcher.dateTimeStatistics = switchersByDateTimeMetrics;
        }
    });

    componentsGrouped.forEach(component => {
        const componentMetrics = metrics.filter(metric => metric.component === component.component);
        const positiveMetrics = componentMetrics.filter(componentM => componentM.result);
        component.positive = positiveMetrics.length;
        component.negative = componentMetrics.length - positiveMetrics.length;
    });
    
    return {
        total: metrics.length,
        positive: results.length,
        negative: metrics.length - results.length,
        date_from: metrics.length ? metrics[0].date : undefined,
        date_to: metrics.length ? metrics[metrics.length - 1].date : undefined,
        reasons: reasonsGrouped,
        switchers: switchersGrouped,
        components: componentsGrouped
    }
}

// GET /metric/ID??key=&component=&result=&group=&dateBefore=&dateAfter=
// GET /metric/ID?sortBy=-date;key;component;result
// GET /metric/ID?limit=10&skip=20
// GET /metric/ID
router.get('/metric/:id', [check('id').isMongoId()], auth, async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    }

    const args = {}
    let dateGroupPattern = 'YYYY-MM'

    if (req.query.key) { 
        const config = await Config.findOne({ key: req.query.key })
        if (config) {
            args.config = config._id
            dateGroupPattern = req.query.dateGroupPattern ? req.query.dateGroupPattern : dateGroupPattern;
        } else {
            return res.send()
        }
    }
    if (req.query.group) { args.group = req.query.group }
    if (req.query.environment) { args.environment = req.query.environment }
    else { args.environment = EnvType.DEFAULT }
    if (req.query.component) { args.component = req.query.component }
    if (req.query.result) { args.result = req.query.result }
    if (req.query.dateBefore && !req.query.dateAfter) { 
        args.date = { $lte: new Date(req.query.dateBefore) } 
    }
    if (req.query.dateAfter && !req.query.dateBefore) { 
        args.date = { $gte: new Date(req.query.dateAfter) } 
    }
    if (req.query.dateAfter && req.query.dateBefore) { 
        args.date = { $gte: new Date(req.query.dateAfter), $lte: new Date(req.query.dateBefore) } 
    }

    try {
        const metrics = await Metric.find({ domain: req.params.id, ...args }, 
            'config component entry result reason group environment date -_id', {
                skip: parseInt(req.query.skip),
                limit: parseInt(req.query.limit),
            }).sort(req.query.sortBy ? req.query.sortBy.replace(';', ' ') : 'date')
            .populate({ path: 'config', select: 'key -_id' }).exec();

        res.send({
            statistics: getStatistics(metrics, dateGroupPattern),
            data: metrics
        })
    } catch (e) {
        responseException(res, e, 500);
    }
})

router.delete('/metric/:key', auth, async (req, res) => {
    try {
        let config = await Config.findOne({ key: req.params.key })
        if (!config) {
            return res.status(404).send()
        }

        config = await verifyOwnership(req.admin, config, config.domain, ActionTypes.DELETE, RouterTypes.ADMIN)

        await Metric.deleteMany({ config: config._id })
        res.send({ message: 'Switcher metrics deleted' });
    } catch (e) {
        responseException(res, e, 500);
    }
})

export default router;