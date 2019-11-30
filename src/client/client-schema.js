const graphql = require('graphql')
const Domain = require('../models/domain')
const GroupConfig = require('../models/group-config')
const Config = require('../models/config')
const { ConfigStrategy, processOperation } = require('../models/config-strategy')
const { 
    GraphQLSchema,
    GraphQLObjectType,
    GraphQLString,
    GraphQLList,
    GraphQLBoolean,
    GraphQLNonNull,
    GraphQLInputObjectType
} = graphql

const domainType = new GraphQLObjectType({
    name: 'Domain',
    fields: {
        name: {
            type: GraphQLString
        },
        description: {
            type: GraphQLString
        },
        activated: {
            type: GraphQLBoolean
        }
    }
})

const groupConfigType = new GraphQLObjectType({
    name: 'Group',
    fields: {
        name: {
            type: GraphQLString
        },
        description: {
            type: GraphQLString
        },
        activated: {
            type: GraphQLBoolean
        }
    }
})

const strategyInputType = new GraphQLInputObjectType({
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

const strategyType = new GraphQLObjectType({
    name: 'Strategy',
    fields: {
        strategy: {
            type: GraphQLString
        },
        activated: {
            type: GraphQLBoolean
        },
        operation: {
            type: GraphQLString
        },
        values: {
            type: new GraphQLList(GraphQLString)
        }
    }
})

const resultType = new GraphQLObjectType({
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

const criteriaType = new GraphQLObjectType({
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

const queryType = new GraphQLObjectType({
    name: 'Query',
    fields: {
        criteria: {
            type: criteriaType,
            args: {
                key: {
                    type: new GraphQLNonNull(GraphQLString)
                },
                entry: {
                    type: new GraphQLList(strategyInputType)
                }
            },
            resolve: (source, { key, entry }, context) => {
                context.entry = entry
                return checkConfig(key)
            }
        }
    }
})

// RESOLVERS

const checkConfig = async (key) => {
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

const schema = new GraphQLSchema({
  query: queryType
})

module.exports = schema