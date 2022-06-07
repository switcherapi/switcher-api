import moment from 'moment';
import { ObjectId } from 'mongodb';
import { EnvType } from '../models/environment';
import { Metric } from '../models/metric';

export async function aggreagateReasons(aggregate, result) {
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

export async function aggregateComponents(aggregate, dateGroupPattern, result) {
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

export async function aggregateSwitchers(aggregate, dateGroupPattern, result) {
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

export function buildMetricsFilter(req) {
    let aggregate = Metric.aggregate();
    let args = {};

    args.domain = req.query.domainid;
    aggregate.match({ domain: new ObjectId(req.query.domainid.toString()) });

    if (req.query.environment) {
        args.environment = req.query.environment;
        aggregate.match({ environment: req.query.environment.toString() });
    } else { 
        args.environment = EnvType.DEFAULT;
        aggregate.match({ environment: EnvType.DEFAULT });
    }

    if (req.query.result) { 
        args.result = req.query.result;
        aggregate.match({ result: req.query.result.toString() === 'true' });
    }

    if (req.query.component) { 
        args.component = req.query.component;
        aggregate.match({ component: req.query.component.toString() });
    }
    
    if (req.query.group) { 
        args.group = req.query.group;
        aggregate.match({ group: req.query.group.toString() });
    }

    if (req.query.dateBefore && !req.query.dateAfter) { 
        args.date = { $lte: new Date(req.query.dateBefore) };
        aggregate.match({ date: { $lte: new Date(req.query.dateBefore.toString()) } });
    } else if (req.query.dateAfter && !req.query.dateBefore) { 
        args.date = { $gte: new Date(req.query.dateAfter) };
        aggregate.match({ date: { $gte: new Date(req.query.dateAfter.toString()) } });
    } else if (req.query.dateAfter && req.query.dateBefore) {
        buildRangeDateFilter(req, args, aggregate);
    }

    return { args, aggregate };
}

export function buildStatistics(aggregatedData, dataKey, timeframe = false) {
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