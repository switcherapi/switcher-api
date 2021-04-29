import moment from 'moment';
import { ObjectId } from 'mongodb';
import { EnvType } from '../models/environment';
import { Metric } from '../models/metric';

export async function aggreagateReasons(aggregatorFilter, result) {
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

export async function aggregateComponents(aggregatorFilter, dateGroupPattern, result) {
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

export async function aggregateSwitchers(aggregatorFilter, dateGroupPattern, result) {
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

export function buildMetricsFilter(req) {
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