import { resolveConfigStrategy, resolveConfig, resolveGroupConfig } from './resolvers';
import { GraphQLObjectType, GraphQLString, GraphQLList, GraphQLBoolean } from 'graphql';

export const strategyType = new GraphQLObjectType({
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