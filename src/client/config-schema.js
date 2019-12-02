const graphql = require('graphql')
const Domain = require('../models/domain')
const GroupConfig = require('../models/group-config')
const Config = require('../models/config')
const { ConfigStrategy } = require('../models/config-strategy')
const { 
    GraphQLObjectType,
    GraphQLString,
    GraphQLList,
    GraphQLBoolean
} = graphql

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

const configType = new GraphQLObjectType({
    name: 'Config',
    fields: {
        key: {
            type: GraphQLString
        },
        description: {
            type: GraphQLString
        },
        activated: {
            type: GraphQLBoolean
        },
        strategies: {
            type: new GraphQLList(strategyType),
            args: {
                _id: {
                    type: GraphQLString
                },
                strategy: {
                    type: GraphQLString
                },
                operation: {
                    type: GraphQLString
                }, 
                activated: {
                    type: GraphQLBoolean
                }
            },
            resolve: async (source, { _id, strategy, operation, activated }, context) => {
                const args = {}

                if (_id) { args._id = _id }
                if (strategy) { args.strategy = strategy }
                if (operation) { args.operation = operation }
                if (activated !== undefined) { args.activated = activated }

                return await ConfigStrategy.find({ config: source._id, ...args })
            }
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
        },
        config: {
            type: new GraphQLList(configType),
            args: {
                _id: {
                    type: GraphQLString
                },
                key: {
                    type: GraphQLString
                }, 
                activated: {
                    type: GraphQLBoolean
                }
            },
            resolve: async (source, { _id, key, activated }, context) => {
                const args = {}

                if (_id) { args._id = _id }
                if (key) { args.key = key }
                if (activated !== undefined) { args.activated = activated }

                return await Config.find({ group: source._id, ...args })
            }
        }
    }
})

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
        },
        group: {
            type: new GraphQLList(groupConfigType),
            args: {
                _id: {
                    type: GraphQLString
                },
                name: {
                    type: GraphQLString
                }, 
                activated: {
                    type: GraphQLBoolean
                }
            },
            resolve: async (source, { _id, name, activated }, context) => {
                const args = {}

                if (_id) { args._id = _id }
                if (name) { args.name = name }
                if (activated !== undefined) { args.activated = activated }

                return await GroupConfig.find({ domain: source._id, ...args })
            }
        }
    }
})

const flatType = new GraphQLObjectType({
    name: 'Configuration',
    fields: {
        domain: {
            type: new GraphQLList(domainType)
        },
        group: {
            type: new GraphQLList(groupConfigType)
        },
        config: {
            type: new GraphQLList(configType)
        },
        strategies: {
            type: new GraphQLList(strategyType)
        }
    }
})

const resolveFromConfig = async (key) => {
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

const resolveFromGroup = async (groupConfig) => {
    const group = await GroupConfig.find({ name: groupConfig })
    const config = await Config.find({ group: group[0]._id })
    const domain = await Domain.find({ _id: group[0].domain })

    return {
        domain,
        group,
        config
    }
}

module.exports = {
    domainType,
    groupConfigType,
    configType,
    strategyType,
    flatType,
    resolveFromConfig,
    resolveFromGroup
}