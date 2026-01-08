import moment from 'moment';
import { NotFoundError } from '../exceptions/index.js';
import { verifyOwnership, formatInput } from '../helpers/index.js';
import { EnvType } from '../models/environment.js';
import { Metric } from '../models/metric.js';
import { ActionTypes, RouterTypes } from '../models/permission.js';
import { getConfig } from './config.js';

export async function getData(req, page) {
    const { args } = buildMetricsFilter(req);

    if (req.query.key) { 
        const config = await getConfig({ domain: req.query.domainid, key: req.query.key });
        if (!config) return undefined;
        args.config = config._id;
    }

    const skip = Number.parseInt((process.env.METRICS_MAX_PAGE * Number.parseInt(page)) - process.env.METRICS_MAX_PAGE);
    return Metric.find({ ...args }, 
        'config component entry result reason message group environment date -_id', {
            skip,
            limit: Number.parseInt(process.env.METRICS_MAX_PAGE)
        }).sort(req.query.sortBy ? String(req.query.sortBy).replace(';', ' ') : 'date')
        .populate({ path: 'config', select: 'key -_id' }).exec();
}

export async function getStatistics(req) {
    const switcher = buildMetricsFilter(req);
    const components = buildMetricsFilter(req);
    const reasons = buildMetricsFilter(req);

    const dateGroupPattern = req.query.dateGroupPattern ? 
        req.query.dateGroupPattern : 'YYYY-MM';

    if (req.query.key) { 
        const config = await getConfig({ domain: req.query.domainid, key: req.query.key });
        if (!config) return undefined;

        const switcherId = { config: config._id };
        switcher.aggregate.match(switcherId);
        components.aggregate.match(switcherId);
        reasons.aggregate.match(switcherId);
    }

    let result = {};
    const options = String(req.query.statistics);
    await Promise.all([
        new RegExp(/(switchers)|(all)/).exec(options) ?
            aggregateSwitchers(switcher.aggregate, dateGroupPattern, result) : Promise.resolve(),
        new RegExp(/(components)|(all)/).exec(options) ?
            aggregateComponents(components.aggregate, dateGroupPattern, result) : Promise.resolve(),
        new RegExp(/(reasons)|(all)/).exec(options) ?
            aggreagateReasons(reasons.aggregate, result) : Promise.resolve()
    ]);

    return result;
}

export async function deleteMetrics(req) {
    let config = await getConfig({ domain: req.query.domainid, key: req.query.key });
    if (!config) {
        throw new NotFoundError('Switcher not found');
    }

    config = await verifyOwnership(req.admin, config, config.domain, ActionTypes.DELETE, RouterTypes.ADMIN);
    await Metric.deleteMany({ domain: config.domain, config: config._id }).exec();
}

async function aggreagateReasons(aggregate, result) {
    aggregate.group({
        _id: { reason: '$reason' },
        count: { $sum: 1 }
    });

    let reasonsAggregated = await Metric.aggregate(aggregate.pipeline()).exec();

    reasonsAggregated = reasonsAggregated.map(data => {
        return {
            reason: data._id.reason,
            total: data.count
        };
    });

    result.reasons = reasonsAggregated;
}

async function aggregateComponents(aggregate, dateGroupPattern, result) {
    aggregate.group({
        _id: { component: '$component', result: '$result', date: '$date' },
        count: { $sum: 1 }
    });

    aggregate.lookup({
        from: 'components',
        localField: 'component',
        foreignField: 'id',
        as: 'components'
    });

    aggregate.project({
        count: 1,
        components: {
            $filter: {
                input: '$components',
                as: 'component',
                cond: { $eq: ['$$component.name', '$_id.component'] },
            }
        }
    });

    aggregate.unwind('$components');
    aggregate.project({ count: 1 });
    aggregate.sort({ switchers: 1 });

    let componentsAggregated = await Metric.aggregate(aggregate.pipeline()).exec();

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

async function aggregateSwitchers(aggregate, dateGroupPattern, result) {
    aggregate.group({
        _id: { config: '$config', result: '$result', date: '$date' },
        count: { $sum: 1 }
    });

    aggregate.addFields({ 
        convertedId: { 
            $toObjectId: '$_id.config' 
        } 
    });

    aggregate.lookup({
        from: 'configs',
        localField: 'config',
        foreignField: 'id',
        as: 'switchers'
    });

    aggregate.project({
        count: 1,
        switchers: {
            $filter: {
                input: '$switchers',
                as: 'switcher',
                cond: { $eq: ['$$switcher._id', '$convertedId'] },
            }
        }
    });

    aggregate.unwind('$switchers');
    aggregate.project({ count: 1, switchers: { key: 1 } });
    aggregate.sort({ switchers: 1 });

    let switchersAggregated = await Metric.aggregate(aggregate.pipeline()).exec();

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

function buildMetricsFilter(req) {
    let aggregate = Metric.aggregate();
    let args = {};

    args.domain = req.query.domainid;
    aggregate.match({ $expr: { $eq: [{ $toString: '$domain' }, args.domain] } });

    if (req.query.environment) {
        const environment = formatInput(String(req.query.environment));
        args.environment = environment;
        aggregate.match({ environment: environment });
    } else { 
        args.environment = EnvType.DEFAULT;
        aggregate.match({ environment: EnvType.DEFAULT });
    }

    if (req.query.result) { 
        args.result = Boolean(req.query.result);
        aggregate.match({ result: String(req.query.result) === 'true' });
    }

    if (req.query.component) { 
        const component = formatInput(String(req.query.component));
        args.component = component;
        aggregate.match({ component: component });
    }
    
    if (req.query.group) { 
        const group = formatInput(String(req.query.group), { allowSpace: true });
        args.group = group;
        aggregate.match({ group: group });
    }

    if (req.query.dateBefore && !req.query.dateAfter) { 
        args.date = { $lte: new Date(req.query.dateBefore) };
        aggregate.match({ date: { $lte: new Date(String(req.query.dateBefore)) } });
    } else if (req.query.dateAfter && !req.query.dateBefore) { 
        args.date = { $gte: new Date(req.query.dateAfter) };
        aggregate.match({ date: { $gte: new Date(String(req.query.dateAfter)) } });
    } else if (req.query.dateAfter && req.query.dateBefore) {
        buildRangeDateFilter(req, args, aggregate);
    }

    return { args, aggregate };
}

export function buildStatistics(aggregatedData, dataKey, timeframe = false) {
    let compiledData = [];

    for (const data of aggregatedData) {
        const entry = compiledData.filter(dataEntry => dataEntry[`${dataKey}`] === data[`${dataKey}`]);
        const result = data.result ? 'positive' : 'negative';

        if (entry.length) {
            entry[0][`${result}`] += data.total;
            entry[0].total = entry[0][`${result}`] + entry[0][`${data.result ? 'negative' : 'positive'}`];
        } else {
            const newEntry = {
                [`${dataKey}`]: data[`${dataKey}`],
                [`${result}`]: data.total,
                [`${data.result ? 'negative' : 'positive'}`]: 0,
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
    }
    return compiledData;
}


export function buildRangeDateFilter(req, args, aggregate) {
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
        aggregate.match({ date: { $lte: dateBefore } });
        aggregate.match({ date: { $gte: dateAfter } });
    } else {
        args.date = { $gte: new Date(req.query.dateAfter), $lte: new Date(req.query.dateBefore) };
        aggregate.match({ date: { $lte: new Date(req.query.dateBefore) } });
        aggregate.match({ date: { $gte: new Date(req.query.dateAfter) } });
    }
}