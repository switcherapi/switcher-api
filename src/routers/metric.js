import express from 'express';
import moment from 'moment';
import { Metric } from '../models/metric';
import { check, validationResult } from 'express-validator';
import { auth } from '../middleware/auth';
import { EnvType } from '../models/environment';
import { Config } from '../models/config';
import { verifyOwnership, responseException } from './common/index';
import { ActionTypes, RouterTypes } from '../models/role';
import { ObjectId } from 'mongodb';

const router = new express.Router();

function buildMetricsFilter(req) {
    let aggregatorFilter = { $match: { $expr: { $and: [] } } };
    let args = {};

    args.domain = req.query.domainid;
    aggregatorFilter.$match.$expr.$and.push({ $eq: ['$domain', new ObjectId(req.query.domainid)] });

    if (req.query.environment) {
        args.environment = req.query.environment;
        aggregatorFilter.$match.$expr.$and.push({ $eq: ['$environment', req.query.environment] }); 
    } else { 
        args.environment = EnvType.DEFAULT;
        aggregatorFilter.$match.$expr.$and.push({ $eq: ['$environment', EnvType.DEFAULT] }); 
    }
    if (req.query.result) { 
        args.result = req.query.result;
        aggregatorFilter.$match.$expr.$and.push({ $eq: ['$result', req.query.result === 'true'] }); 
    }
    if (req.query.component) { 
        args.component = req.query.component;
        aggregatorFilter.$match.$expr.$and.push({ $eq: ['$component', req.query.component] }); 
    }
    if (req.query.group) { 
        args.group = req.query.group;
        aggregatorFilter.$match.$expr.$and.push({ $eq: ['$group', req.query.group] }); 
    }

    if (req.query.dateBefore && !req.query.dateAfter) { 
        args.date = { $lte: new Date(req.query.dateBefore) };
        aggregatorFilter.$match.$expr.$and.push({ $lte: ['$date', new Date(req.query.dateBefore)] });
    } else if (req.query.dateAfter && !req.query.dateBefore) { 
        args.date = { $gte: new Date(req.query.dateAfter) };
        aggregatorFilter.$match.$expr.$and.push({ $gte: ['$date', new Date(req.query.dateAfter)] });
    } else if (req.query.dateAfter && req.query.dateBefore) {
        buildRangeDateFilter(req, args, aggregatorFilter);
    }

    return { aggregatorFilter, args };
}

export function buildRangeDateFilter(req, args, aggregatorFilter) {
    // create interval when dates are the exactly the same
    if (req.query.dateAfter === req.query.dateBefore) {
        let dateAfter, dateBefore;

        if (req.query.dateAfter.length === 7) {
            dateAfter = moment(req.query.dateAfter, req.query.dateGroupPattern).toDate();
            dateBefore = moment(req.query.dateAfter, req.query.dateGroupPattern).add(+1, 'month').toDate();
        }
        else if (req.query.dateAfter.length === 10) {
            dateAfter = moment(req.query.dateAfter, req.query.dateGroupPattern).toDate();
            dateBefore = moment(req.query.dateAfter, req.query.dateGroupPattern).add(+1, 'day').toDate();
        }
        else if (req.query.dateAfter.length === 13) {
            dateAfter = moment(req.query.dateAfter, req.query.dateGroupPattern).toDate();
            dateBefore = moment(req.query.dateAfter, req.query.dateGroupPattern).add(+1, 'hour').toDate();
        }
        else {
            dateAfter = moment(req.query.dateAfter, req.query.dateGroupPattern).toDate();
            dateBefore = moment(req.query.dateAfter, req.query.dateGroupPattern).add(+1, 'minute').toDate();
        }

        args.date = { $gte: dateAfter, $lte: dateBefore };
        aggregatorFilter.$match.$expr.$and.push({ $lte: ['$date', dateBefore] });
        aggregatorFilter.$match.$expr.$and.push({ $gte: ['$date', dateAfter] });
    } else {
        args.date = { $gte: new Date(req.query.dateAfter), $lte: new Date(req.query.dateBefore) };
        aggregatorFilter.$match.$expr.$and.push({ $lte: ['$date', new Date(req.query.dateBefore)] });
        aggregatorFilter.$match.$expr.$and.push({ $gte: ['$date', new Date(req.query.dateAfter)] });
    }
}

function buildStatistics(aggregatedData, dataKey, timeframe = false) {
    let compiledData = [];

    aggregatedData.forEach(data => {
        const entry = compiledData.filter(dataEntry => dataEntry[`${dataKey}`] === data[`${dataKey}`]);
        const result = data.result ? 'positive' : 'negative';

        if (entry.length) {
            entry[0][`${result}`] += data.total;
            entry[0].total = entry[0][`${result}`] + entry[0][`${!data.result ? 'positive' : 'negative'}`];
        } else {
            const newEntry = {
                [`${dataKey}`]: data[`${dataKey}`],
                [`${result}`]: data.total,
                [`${!data.result ? 'positive' : 'negative'}`]: 0,
                total: data.total
            };
            if (!timeframe) {
                const aggregatedDateData = aggregatedData
                    .filter(dateEntry => dateEntry[`${dataKey}`] === data[`${dataKey}`]);
                    
                newEntry.dateTimeStatistics =
                    buildStatistics(aggregatedDateData, 'date', true)
                        .sort((dateA, dateB) => dateA.date < dateB.date ? -1 : 1);
            }
            compiledData.push(newEntry);
        }
    });
    return compiledData;
}

async function aggreagateReasons(aggregatorFilter, result) {
    let reasonsAggregated = await Metric.aggregate([
        aggregatorFilter,
        {
            $group: {
                _id: { reason: '$reason' },
                count: { $sum: 1 }
            }
        }
    ]);

    reasonsAggregated = reasonsAggregated.map(data => {
        return {
            reason: data._id.reason,
            total: data.count
        };
    });

    result.reasons = reasonsAggregated;
}

async function aggregateComponents(aggregatorFilter, dateGroupPattern, result) {
    let componentsAggregated = await Metric.aggregate([
        aggregatorFilter,
        {
            $group: {
                _id: { component: '$component', result: '$result', date: '$date' },
                count: { $sum: 1 }
            }
        },
        {
            $lookup: {
                from: 'components',
                localField: 'component',
                foreignField: 'id',
                as: 'components'
            }
        },
        {
            $project: {
                count: 1,
                components: {
                    $filter: {
                        input: '$components',
                        as: 'component',
                        cond: { $eq: ['$$component.name', '$_id.component'] },
                    }
                }
            }
        },
        { $unwind: '$components' },
        {
            $project: {
                count: 1
            }
        },
        { $sort: { switchers: 1 } }
    ]);

    componentsAggregated = componentsAggregated.map(data => {
        return {
            component: data._id.component,
            result: data._id.result,
            date: moment(data._id.date).format(dateGroupPattern).toString(),
            total: data.count
        };
    });

    result.components = buildStatistics(componentsAggregated, 'component');
}

async function aggregateSwitchers(aggregatorFilter, dateGroupPattern, result) {
    let switchersAggregated = await Metric.aggregate([
        aggregatorFilter,
        {
            $group: {
                _id: { config: '$config', result: '$result', date: '$date' },
                count: { $sum: 1 }
            }
        },
        { $addFields: { convertedId: { $toObjectId: '$_id.config' } } },
        {
            $lookup: {
                from: 'configs',
                localField: 'config',
                foreignField: 'id',
                as: 'switchers'
            }
        },
        {
            $project: {
                count: 1,
                switchers: {
                    $filter: {
                        input: '$switchers',
                        as: 'switcher',
                        cond: { $eq: ['$$switcher._id', '$convertedId'] },
                    }
                }
            }
        },
        { $unwind: '$switchers' },
        {
            $project: {
                count: 1,
                switchers: { key: 1 }
            }
        },
        { $sort: { switchers: 1 } }
    ]);

    switchersAggregated = switchersAggregated.map(data => {
        return {
            switcher: data.switchers.key,
            result: data._id.result,
            date: moment(data._id.date).format(dateGroupPattern).toString(),
            total: data.count
        };
    });

    result.switchers = buildStatistics(switchersAggregated, 'switcher');
}

// GET /metric/data/ID??key=&component=&result=&group=&dateBefore=&dateAfter=
// GET /metric/data/ID?sortBy=-date;key;component;result
// GET /metric/data/ID?page=1
router.get('/metric/data/', [
    check('domainid').isMongoId(), 
    check('page', 'page is required as query parameter').isLength({ min: 1 })
], auth, async (req, res) => {

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    }

    let { args } = buildMetricsFilter(req);

    try {
        if (req.query.key) { 
            const config = await Config.findOne({ domain: req.query.domainid, key: req.query.key });
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
], auth, async (req, res) => {

    let result = {};

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    }

    try {
        const { aggregatorFilter } = buildMetricsFilter(req);
        const dateGroupPattern =  req.query.dateGroupPattern ? 
            req.query.dateGroupPattern : 'YYYY-MM';

        if (req.query.key) { 
            const config = await Config.findOne({ domain: req.query.domainid, key: req.query.key });
            if (config) {
                aggregatorFilter.$match.$expr.$and.push({ $eq: ['$config', config._id] });
            } else {
                return res.send();
            }
        }

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
], auth, async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(422).json({ errors: errors.array() });
        }

        let config = await Config.findOne({ domain: req.query.domainid, key: req.query.key });
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