import { resolveConfigStrategy, resolveConfig, resolveGroupConfig } from './resolvers';
import { GraphQLObjectType, GraphQLString, GraphQLList, GraphQLBoolean } from 'graphql';
import { EnvType } from '../models/environment';

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
            resolve: async (source, { _id, strategy, operation, activated }) => {
                return await resolveConfigStrategy(source, _id, strategy, operation, activated);
            }
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
            resolve: async (source, { _id, key, activated }) => {
                return await resolveConfig(source, _id, key, activated);
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
            resolve: async (source, { _id, name, activated }) => {
                return await resolveGroupConfig(source, _id, name, activated);
            }
        }
    }
})

export const flatConfigurationType = new GraphQLObjectType({
    name: 'FlatConfiguration',
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