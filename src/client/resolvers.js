import Domain from '../models/domain';
import GroupConfig from '../models/group-config';
import Config from '../models/config';
import { ConfigStrategy, processOperation } from '../models/config-strategy';

export const resolveConfigStrategy = async (source, _id, strategy, operation, activated) => {
    const args = {}

    if (_id) { args._id = _id }
    if (strategy) { args.strategy = strategy }
    if (operation) { args.operation = operation }
    if (activated !== undefined) { args.activated = activated }

    return await ConfigStrategy.find({ config: source._id, ...args })
}

export const resolveConfig = async (source, _id, key, activated) => {
    const args = {}

    if (_id) { args._id = _id }
    if (key) { args.key = key }
    if (activated !== undefined) { args.activated = activated }

    return await Config.find({ group: source._id, ...args })
}

export const resolveGroupConfig = async (source, _id, name, activated) => {
    const args = {}

    if (_id) { args._id = _id }
    if (name) { args.name = name }
    if (activated !== undefined) { args.activated = activated }

    return await GroupConfig.find({ domain: source._id, ...args })
}

export const resolveDomain = async (_id, name, token, activated) => {
    const args = {}

    if (_id) { args._id = _id }
    if (name) { args.name = name }
    if (token) { args.token = token }
    if (activated !== undefined) { args.activated = activated }

    return await Domain.find({ ...args })
}

export const resolveFlatConfigurationByConfig = async (key) => {
    const config = await Config.find({ key })
    const group = await GroupConfig.find({ _id: config[0].group })
    const domain = await Domain.find({ _id: group[0].domain })
    const strategies = await ConfigStrategy.find({ config: config[0]._id })

    return {
        domain,
        group,
        config,
        strategies
    }
}

export const resolveFlatConfigurationTypeByGroup = async (groupConfig) => {
    const group = await GroupConfig.find({ name: groupConfig })
    const config = await Config.find({ group: group[0]._id })
    const domain = await Domain.find({ _id: group[0].domain })

    return {
        domain,
        group,
        config
    }
}

const checkGroup = async (configId) => {
    const config = await Config.findOne({ _id: configId })
    const group = await GroupConfig.findOne({ _id: config.group })
    return group
}

const checkConfigStrategies = async (configId) => {
    const strategies = await ConfigStrategy.find({ config: configId })
    return strategies
}

export const resolveCriteria = async (config, context) => {
    context.key = config.key

    const group = await checkGroup(config._id)
    const strategies = await checkConfigStrategies(config._id)
    
    const result = {
        domain: context.domain,
        group,
        strategies
    }

    if (!config.activated || !group.activated || !context.domain.activated) {
        result.return = false
        result.reason = !config.activated ? 'Config disabled' : 
                        !group.activated ? 'Group disabled' : 
                        !context.domain.activated ? 'Domain disabled' : ''
        return result
    }

    if (strategies) {
        for (var i = 0; i < strategies.length; i++) {
            if (!strategies[i].activated) {
                continue;
            }

            const input = context.entry.filter(e => e.strategy == strategies[i].strategy)
            if (input.length > 0) {
                if (!processOperation(strategies[i].strategy, strategies[i].operation, input[0].input, strategies[i].values)) {
                    result.return = false
                    result.reason = `Strategy '${strategies[i].strategy}' does not agree`
                    return result
                }
            } else {
                result.return = false
                result.reason = `Strategy '${strategies[i].strategy}' did not receive any input`
                return result
            }
        }
    }

    result.return = true
    result.reason = 'Success'
    return result
}

export const resolveConfigByKey = async (key) => {
    return await Config.findOne({ key })
}