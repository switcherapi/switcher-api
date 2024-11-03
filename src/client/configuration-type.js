import { GraphQLObjectType, GraphQLString, GraphQLList, GraphQLBoolean, GraphQLFloat } from 'graphql';
import { resolveConfigStrategy, resolveConfig, resolveGroupConfig, resolveEnvStatus, resolveRelay } from './resolvers.js';
import { EnvType } from '../models/environment.js';
import { 
    resolveFlatDomain, 
    resolveFlatGroupConfig, 
    resolveFlatConfig, 
    resolveFlatConfigStrategy, 
    resolveComponents, 
    resolveFlatEnv 
} from './configuration-resolvers.js';

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
            resolve: (source, _args, { environment }) => {
                return source.activated[`${environment}`] === undefined ? 
                    source.activated[`${EnvType.DEFAULT}`] : source.activated[`${environment}`];
            }
        },
        statusByEnv: {
            type: new GraphQLList(envStatus),
            resolve: (source) => {
                return resolveEnvStatus(source);
            }
        },
        operation: {
            type: GraphQLString
        },
        values: {
            type: new GraphQLList(GraphQLString)
        }
    }
});

export const relayType = new GraphQLObjectType({
    name: 'Relay',
    fields: {
        relay_type: {
            type: GraphQLString,
            resolve: (source) => source.type
        },
        relay_method: {
            type: GraphQLString,
            resolve: (source) => source.method
        },
        relay_endpoint: {
            type: GraphQLString,
            resolve: (source, _args, { environment }) => {
                return source.endpoint[`${environment}`] === undefined ?
                    source.endpoint[`${EnvType.DEFAULT}`] : source.endpoint[`${environment}`];
            }
        },
        description: {
            type: GraphQLString
        },
        activated: {
            type: GraphQLBoolean,
            resolve: (source, _args, { environment }) => {
                return source.activated[`${environment}`] === undefined ? 
                    source.activated[`${EnvType.DEFAULT}`] : source.activated[`${environment}`];
            }
        },
        statusByEnv: {
            type: new GraphQLList(envStatus),
            resolve: (source) => {
                return resolveEnvStatus(source);
            }
        },
    }
});

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
            resolve: (source, _args, { environment }) => {
                return source.activated[`${environment}`] === undefined ? 
                    source.activated[`${EnvType.DEFAULT}`] : source.activated[`${environment}`];
            }
        },
        statusByEnv: {
            type: new GraphQLList(envStatus),
            resolve: (source) => {
                return resolveEnvStatus(source);
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
                    type: GraphQLBoolean
                }
            },
            resolve: async (source, { _id, strategy, operation, activated }, context) => {
                return resolveConfigStrategy(source, _id, strategy, operation, activated, context);
            }
        },
        components: {
            type: new GraphQLList(GraphQLString),
            resolve: async (source) => {
                return resolveComponents(source);
            }
        },
        relay: {
            type: relayType,
            resolve: (source, _args, context) => {
                return resolveRelay(source, context);
            }
        }
    }
});

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
            resolve: (source, _args, { environment }) => {
                return source.activated[`${environment}`] === undefined ? 
                    source.activated[`${EnvType.DEFAULT}`] : source.activated[`${environment}`];
            }
        },
        statusByEnv: {
            type: new GraphQLList(envStatus),
            resolve: (source) => {
                return resolveEnvStatus(source);
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
                    type: GraphQLBoolean
                }
            },
            resolve: async (source, { _id, key, activated }, context) => {
                return resolveConfig(source, _id, key, activated, context);
            }
        }
    }
});

export const domainType = new GraphQLObjectType({
    name: 'Domain',
    fields: {
        _id: {
            type: GraphQLString
        },
        version: {
            type: GraphQLFloat,
            resolve: (source) => source.lastUpdate
        },
        name: {
            type: GraphQLString
        },
        description: {
            type: GraphQLString
        },
        owner: {
            type: GraphQLString
        },
        transfer: {
            type: GraphQLBoolean
        },
        integrations: { 
            type: new GraphQLObjectType({
                name: 'Integrations',
                fields: {
                    slack: { 
                        type: GraphQLString
                    }
                }
            })
        },
        activated: {
            type: GraphQLBoolean,
            resolve: (source, _args, { environment }) => {
                return source.activated[`${environment}`] === undefined ? 
                    source.activated[`${EnvType.DEFAULT}`] : source.activated[`${environment}`];
            }
        },
        statusByEnv: {
            type: new GraphQLList(envStatus),
            resolve: (source) => {
                return resolveEnvStatus(source);
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
                    type: GraphQLBoolean
                }
            },
            resolve: async (source, { _id, name, activated }, context) => {
                return resolveGroupConfig(source, _id, name, activated, context);
            }
        }
    }
});

export const flatConfigurationType = new GraphQLObjectType({
    name: 'FlatConfiguration',
    fields: {
        domain: {
            type: domainType,
            resolve: async (source, _args, context) => {
                return resolveFlatDomain(source, context);
            }
        },
        group: {
            type: new GraphQLList(groupConfigType),
            resolve: async (source, _args, context) => {
                return resolveFlatGroupConfig(source, context);
            }
        },
        config: {
            type: new GraphQLList(configType),
            resolve: async (source, _args, context) => {
                return resolveFlatConfig(source, context);
            }
        },
        strategies: {
            type: new GraphQLList(strategyType),
            resolve: async (source, _args, context) => {
                return resolveFlatConfigStrategy(source, context);
            }
        },
        environments: {
            type: new GraphQLList(GraphQLString),
            resolve: async (_source, _args, context) => {
                return resolveFlatEnv(context);
            }
        }
    }
});