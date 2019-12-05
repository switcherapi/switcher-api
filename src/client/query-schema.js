import { GraphQLSchema, GraphQLObjectType, GraphQLString, GraphQLList, GraphQLBoolean, GraphQLNonNull } from 'graphql';
import { domainType, flatConfigurationType } from './configuration-type';
import { strategyInputType, criteriaType } from './criteria-type';
import { resolveConfigByKey, resolveDomain, resolveFlatConfigurationByConfig, resolveFlatConfigurationTypeByGroup } from './resolvers';

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
            resolve: async (source, { key, entry }, context) => {
                context.entry = entry
                return resolveConfigByKey(key)
            }
        },
        domain: {
            type: new GraphQLList(domainType),
            args: {
                _id: {
                    type: GraphQLString
                },
                name: {
                    type: GraphQLString
                },
                token: {
                    type: GraphQLString
                }, 
                activated: {
                    type: GraphQLBoolean
                }
            },
            resolve: async (source, { _id, name, token, activated }) => {
                return await resolveDomain(_id, name, token, activated)
            }
        },
        configuration: {
            type: flatConfigurationType,
            args: {
                group: {
                    type: GraphQLString
                },
                key: {
                    type: GraphQLString
                }
            },
            resolve: async (source, { group, key }, context) => {
                if (key) {
                    return resolveFlatConfigurationByConfig(key)
                }

                if (group) {
                    return resolveFlatConfigurationTypeByGroup(group)
                }
            }
        },
    }
})

const schema = new GraphQLSchema({
  query: queryType
})

export default schema;