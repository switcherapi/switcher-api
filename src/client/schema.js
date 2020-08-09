import { GraphQLSchema, GraphQLObjectType, GraphQLString, GraphQLList, GraphQLBoolean, GraphQLNonNull } from 'graphql';
import { domainType, flatConfigurationType } from './configuration-type';
import { EnvType } from '../models/environment';
import { strategyInputType, criteriaType } from './criteria-type';
import { resolveConfigByKey, resolveDomain } from './resolvers';
import { resolveFlatConfigurationByConfig, resolveFlatConfigurationTypeByGroup } from './configuration-resolvers';

const queryType = new GraphQLObjectType({
    name: 'Query',
    fields: {
        criteria: {
            type: criteriaType,
            args: {
                key: {
                    type: GraphQLNonNull(GraphQLString)
                },
                entry: {
                    type: GraphQLList(strategyInputType)
                },
                bypassMetric: {
                    type: GraphQLBoolean
                }
            },
            resolve: async (source, { key, entry, bypassMetric }, context) => {
                context.entry = entry
                context.bypassMetric = bypassMetric
                return resolveConfigByKey(key)
            }
        },
        domain: {
            type: domainType,
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
                },
                environment: {
                    type: GraphQLString
                }
            },
            resolve: async (source, { _id, name, activated, environment }, context) => {
                if (environment) {
                    context.environment = environment;
                }
                return await resolveDomain(_id, name, activated, context)
            }
        },
        configuration: {
            type: flatConfigurationType,
            args: {
                domain: {
                    type: GraphQLString
                },
                group: {
                    type: GraphQLString
                },
                key: {
                    type: GraphQLString
                },
                environment: {
                    type: GraphQLString
                }
            },
            resolve: async (source, { domain, group, key, environment }, context) => {
                if (environment) {
                    context.environment = environment;
                }

                if (context.domain || domain) {
                    context.environment = environment;
                    context.domain = context.domain || domain;
                    if (key) {
                        return resolveFlatConfigurationByConfig(key, context.domain)
                    }

                    if (group) {
                        return resolveFlatConfigurationTypeByGroup(group, context.domain)
                    }
                }
            }
        },
    }
})

const schema = new GraphQLSchema({
  query: queryType
})

export default schema;