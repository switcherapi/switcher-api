import GroupConfig from '../models/group-config';
import Config from '../models/config';
import { ConfigStrategy, processOperation } from '../models/config-strategy';
import { domainType, groupConfigType, strategyType } from './config-schema';
import { GraphQLObjectType, GraphQLString, GraphQLList, GraphQLBoolean, GraphQLNonNull, GraphQLInputObjectType } from 'graphql';

export const strategyInputType = new GraphQLInputObjectType({
    name: 'StrategyInput',
    fields: {
        strategy: {
            type: new GraphQLNonNull(GraphQLString)
        },
        input: {
            type: new GraphQLNonNull(GraphQLString)
        }
    }
})

export const resultType = new GraphQLObjectType({
    name: 'Result',
    fields: {
        return: {
            type: GraphQLBoolean  
        },
        reason: {
            type: GraphQLString
        },
        domain: {
            type: domainType
        },
        group: {
            type: groupConfigType
        },
        strategies: {
            type: new GraphQLList(strategyType)
        }
    }
})

export const criteriaType = new GraphQLObjectType({
    name: 'Criteria',
    fields: {
        key: {
            type: GraphQLString
        },
        activated: {
            type: GraphQLBoolean
        },
        result: {
            type: resultType,
            resolve: (source, params, context) => {
                return evaluateCriteria(source, context)
            }
        }
    }
})

export const checkConfig = async (key) => {
    return await Config.findOne({ key })
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

const evaluateCriteria = async (config, context) => {
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