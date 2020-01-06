import { resolveConfigStrategy, resolveConfig, resolveGroupConfig, resolveEnvStatus } from './resolvers';
import { GraphQLObjectType, GraphQLString, GraphQLList, GraphQLBoolean } from 'graphql';
import { EnvType } from '../models/environment';
import { resolveFlatDomain, resolveFlatGroupConfig, resolveFlatConfig, resolveFlatConfigStrategy } from './configuration-resolvers';

const envStatus = new GraphQLObjectType({
    name: 'EnvStatus',
    fields: {
        env: { 
            type: GraphQLString
        },
        value: { 
            type: GraphQLBoolean
         }
    }
});

export const strategyType = new GraphQLObjectType({
    name: 'Strategy',
    fields: {
        _id: {
            type: GraphQLString
        },
        strategy: {
            type: GraphQLString
        },
        activated: {
            type: GraphQLBoolean,
            resolve: (source, args, { environment }) => {
                return source.activated[`${environment}`] === undefined ? 
                    source.activated[`${EnvType.DEFAULT}`] : source.activated[`${environment}`]
            }
        },
        statusByEnv: {
            type: GraphQLList(envStatus),
            resolve: (source) => {
                return resolveEnvStatus(source)
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
        _id: {
            type: GraphQLString
        },
        key: {
            type: GraphQLString
        },
        description: {
            type: GraphQLString
        },
        activated: {
            type: GraphQLBoolean,
            resolve: (source, args, { environment }) => {
                return source.activated[`${environment}`] === undefined ? 
                    source.activated[`${EnvType.DEFAULT}`] : source.activated[`${environment}`]
            }
        },
        statusByEnv: {
            type: GraphQLList(envStatus),
            resolve: (source) => {
                return resolveEnvStatus(source)
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
                        return source.activated[`${environment}`] === undefined ? 
                            source.activated[`${EnvType.DEFAULT}`] : source.activated[`${environment}`]
                    }
                }
            },
            resolve: async (source, { _id, strategy, operation, activated }, context) => {
                return await resolveConfigStrategy(source, _id, strategy, operation, activated, context);
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
        _id: {
            type: GraphQLString
        },
        name: {
            type: GraphQLString
        },
        description: {
            type: GraphQLString
        },
        activated: {
            type: GraphQLBoolean,
            resolve: (source, args, { environment }) => {
                return source.activated[`${environment}`] === undefined ? 
                    source.activated[`${EnvType.DEFAULT}`] : source.activated[`${environment}`]
            }
        },
        statusByEnv: {
            type: GraphQLList(envStatus),
            resolve: (source) => {
                return resolveEnvStatus(source)
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
                        return source.activated[`${environment}`] === undefined ? 
                            source.activated[`${EnvType.DEFAULT}`] : source.activated[`${environment}`]
                    }
                }
            },
            resolve: async (source, { _id, key, activated }, context) => {
                return await resolveConfig(source, _id, key, activated, context);
            }
        }
    }
})

export const domainType = new GraphQLObjectType({
    name: 'Domain',
    fields: {
        _id: {
            type: GraphQLString
        },
        name: {
            type: GraphQLString
        },
        description: {
            type: GraphQLString
        },
        activated: {
            type: GraphQLBoolean,
            resolve: (source, args, { environment }) => {
                return source.activated[`${environment}`] === undefined ? 
                    source.activated[`${EnvType.DEFAULT}`] : source.activated[`${environment}`]
            }
        },
        statusByEnv: {
            type: GraphQLList(envStatus),
            resolve: (source) => {
                return resolveEnvStatus(source)
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
                        return source.activated[`${environment}`] === undefined ? 
                            source.activated[`${EnvType.DEFAULT}`] : source.activated[`${environment}`]
                    }
                }
            },
            resolve: async (source, { _id, name, activated }, context) => {
                return await resolveGroupConfig(source, _id, name, activated, context);
            }
        }
    }
})

export const flatConfigurationType = new GraphQLObjectType({
    name: 'FlatConfiguration',
    fields: {
        domain: {
            type: domainType,
            resolve: async (source, args, context) => {
                return resolveFlatDomain(source, context)
            }
        },
        group: {
            type: new GraphQLList(groupConfigType),
            resolve: async (source, args, context) => {
                return resolveFlatGroupConfig(source, context)
            }
        },
        config: {
            type: new GraphQLList(configType),
            resolve: async (source, args, context) => {
                return resolveFlatConfig(source, context)
            }
        },
        strategies: {
            type: new GraphQLList(strategyType),
            resolve: async (source, args, context) => {
                return resolveFlatConfigStrategy(source, context)
            }
        }
    }
})