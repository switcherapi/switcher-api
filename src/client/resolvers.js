import { EnvType } from '../models/environment';
import Domain from '../models/domain';
import GroupConfig from '../models/group-config';
import Config from '../models/config';
import { addMetrics } from '../models/metric';
import { ConfigStrategy, processOperation } from '../models/config-strategy';

export async function resolveConfigStrategy(source, _id, strategy, operation, activated, environment) {
    const args = {}

    if (_id) { args._id = _id }
    if (strategy) { args.strategy = strategy }
    if (operation) { args.operation = operation }
    if (activated !== undefined) { 
        args.activated = { [`${environment}`]: activated }
    }

    return await ConfigStrategy.find({ config: source._id, ...args }).lean()
}

export async function resolveConfig(source, _id, key, activated, environment) {
    const args = {}

    if (_id) { args._id = _id }
    if (key) { args.key = key }
    if (activated !== undefined) { 
        args.activated = { [`${environment}`]: activated }
    }

    return await Config.find({ group: source._id, ...args }).lean()
}

export async function resolveGroupConfig(source, _id, name, activated, environment) {
    const args = {}

    if (_id) { args._id = _id }
    if (name) { args.name = name }
    if (activated !== undefined) { 
        args.activated = { [`${environment}`]: activated }
    }

    return await GroupConfig.find({ domain: source._id, ...args }).lean()
}

export async function resolveDomain(_id, name, activated, environment) {
    const args = {}

    if (_id) { args._id = _id }
    if (name) { args.name = name }
    if (activated !== undefined) { 
        args.activated = { [`${environment}`]: activated }
    }

    return await Domain.findOne({ ...args }).lean()
}

export async function resolveFlatConfigurationByConfig(key) {
    const config = await Config.find({ key }).lean();
    if (config.length > 0) {
        return { config }
    } else {
        return undefined;
    }
}

export async function resolveFlatConfigurationTypeByGroup(groupConfig) {
    const group = await GroupConfig.find({ name: groupConfig }).lean();
    if (group.length > 0) {
        return { group }
    } else {
        return undefined;
    }
}

async function checkGroup(configId) {
    const config = await Config.findOne({ _id: configId }, null, { lean: true })
    const group = await GroupConfig.findOne({ _id: config.group }, null, { lean: true })
    return group
}

async function checkConfigStrategies (configId, strategyFilter) {
    const strategies = await ConfigStrategy.find({ config: configId }, strategyFilter).lean()
    return strategies
}

export async function resolveCriteria(config, context, strategyFilter) {
    context.key = config.key
    const environment = context.environment
    
    const group = await checkGroup(config._id)
    const strategies = await checkConfigStrategies(config._id, strategyFilter)
    
    let response = {
        domain: context.domain,
        group,
        strategies,
        result: true,
        reason: 'Success'
    }

    // Check flags
    if (config.activated[`${environment}`] === undefined ? !config.activated[`${EnvType.DEFAULT}`] : !config.activated[`${environment}`]) {
        response.result = false
        response.reason = 'Config disabled'
    } else if (group.activated[`${environment}`] === undefined ? !group.activated[`${EnvType.DEFAULT}`] : !group.activated[`${environment}`]) {
        response.result = false
        response.reason = 'Group disabled'
    } else if (context.domain.activated[`${environment}`] === undefined ? !context.domain.activated[`${EnvType.DEFAULT}`] : !context.domain.activated[`${environment}`]) {
        response.result = false
        response.reason = 'Domain disabled'
    }
    
    // Check strategies
    if (response.result && strategies) {
        for (var i = 0; i < strategies.length; i++) {
            if (!strategies[i].activated[`${environment}`]) {
                continue;
            }

            const input = context.entry ? context.entry.filter(e => e.strategy == strategies[i].strategy) : []
            if (input.length) {
                if (!processOperation(strategies[i].strategy, strategies[i].operation, input[0].input, strategies[i].values)) {
                    response.result = false
                    response.reason = `Strategy '${strategies[i].strategy}' does not agree`
                    break;
                }
            } else {
                response.result = false
                response.reason = `Strategy '${strategies[i].strategy}' did not receive any input`
                break;
            }
        }
    }

    if (!context.bypassMetric && process.env.METRICS_ACTIVATED === 'true') {
        addMetrics(context, response)
    }

    return response
}

export const resolveConfigByKey = async (key) => await Config.findOne({ key }, null, { lean: true })