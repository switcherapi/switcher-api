import { resolveConfigStrategy, resolveConfig, resolveGroupConfig } from './resolvers';
import { GraphQLObjectType, GraphQLString, GraphQLList, GraphQLBoolean } from 'graphql';
import GroupConfig from '../models/group-config';
import { ConfigStrategy } from '../models/config-strategy';
import { EnvType } from '../models/environment';
import Config from '../models/config';

export const strategyType = new GraphQLObjectType({
    name: 'Strategy',
    fields: {
        strategy: {
            type: GraphQLString
        },
        activated: {
            type: GraphQLBoolean,
            resolve: (source, args, { environment }) => {
                return source.activated.get(environment) === undefined ? 
                    source.activated.get(EnvType.DEFAULT) : source.activated.get(environment)
            }
        },
        operation: {
            type: GraphQLString
        },
        values: {
            type: new GraphQLList(GraphQLString)
        }
    }
})

export const configType = new GraphQLObjectType({
    name: 'Config',
    fields: {
        key: {
            type: GraphQLString
        },
        description: {
            type: GraphQLString
        },
        activated: {
            type: GraphQLBoolean,
            resolve: (source, args, { environment }) => {
                return source.activated.get(environment) === undefined ? 
                    source.activated.get(EnvType.DEFAULT) : source.activated.get(environment)
            }
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
                    type: GraphQLBoolean,
                    resolve: (source, args, { environment }) => {
                        return source.activated.get(environment) === undefined ? 
                            source.activated.get(EnvType.DEFAULT) : source.activated.get(environment)
                    }
                }
            },
            resolve: async (source, { _id, strategy, operation, activated }, { environment }) => {
                return await resolveConfigStrategy(source, _id, strategy, operation, activated, environment);
            }
        },
        components: {
            type: new GraphQLList(GraphQLString)
        }
    }
})

export const groupConfigType = new GraphQLObjectType({
    name: 'Group',
    fields: {
        name: {
            type: GraphQLString
        },
        description: {
            type: GraphQLString
        },
        activated: {
            type: GraphQLBoolean,
            resolve: (source, args, { environment }) => {
                return source.activated.get(environment) === undefined ? 
                    source.activated.get(EnvType.DEFAULT) : source.activated.get(environment)
            }
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
                    type: GraphQLBoolean,
                    resolve: (source, args, { environment }) => {
                        return source.activated.get(environment) === undefined ? 
                            source.activated.get(EnvType.DEFAULT) : source.activated.get(environment)
                    }
                }
            },
            resolve: async (source, { _id, key, activated }, { environment }) => {
                return await resolveConfig(source, _id, key, activated, environment);
            }
        }
    }
})

export const domainType = new GraphQLObjectType({
    name: 'Domain',
    fields: {
        name: {
            type: GraphQLString
        },
        description: {
            type: GraphQLString
        },
        activated: {
            type: GraphQLBoolean,
            resolve: (source, args, { environment }) => {
                return source.activated.get(environment) === undefined ? 
                    source.activated.get(EnvType.DEFAULT) : source.activated.get(environment)
            }
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
                    type: GraphQLBoolean,
                    resolve: (source, args, { environment }) => {
                        return source.activated.get(environment) === undefined ? 
                            source.activated.get(EnvType.DEFAULT) : source.activated.get(environment)
                    }
                }
            },
            resolve: async (source, { _id, name, activated }, { environment }) => {
                return await resolveGroupConfig(source, _id, name, activated, environment);
            }
        }
    }
})

export const flatConfigurationType = new GraphQLObjectType({
    name: 'FlatConfiguration',
    fields: {
        domain: {
            type: domainType,
            resolve: (source, args, { domain }) => {
                return domain
            }
        },
        group: {
            type: new GraphQLList(groupConfigType),
            resolve: async (source, args) => {
                if (source.config) {
                    return await GroupConfig.find({ _id: source.config[0].group })
                } else if (source.group) {
                    return source.group
                }
            }
        },
        config: {
            type: new GraphQLList(configType),
            resolve: async (source, args) => {
                if (source.config) {
                    return source.config
                } else if (source.group) {
                    return await Config.find({ group: source.group[0]._id })
                }
            }
        },
        strategies: {
            type: new GraphQLList(strategyType),
            resolve: async (source, args) => {
                if (source.config) {
                    return await ConfigStrategy.find({ config: source.config[0]._id })
                }
            }
        }
    }
})