import { GraphQLSchema, GraphQLObjectType, GraphQLString, GraphQLList, GraphQLBoolean, GraphQLNonNull } from 'graphql';
import { domainType, flatType, resolveFromConfig, resolveFromGroup } from './config-schema';
import { strategyInputType, criteriaType, checkConfig } from './criteria-schema';
import Domain from '../models/domain';

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
            resolve: async (source, { _id, name, token, activated }, context) => {
                const args = {}

                if (_id) { args._id = _id }
                if (name) { args.name = name }
                if (token) { args.token = token }
                if (activated !== undefined) { args.activated = activated }

                return await Domain.find({ ...args })
            }
        },
        configuration: {
            type: flatType,
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
                    return resolveFromConfig(key)
                }

                if (group) {
                    return resolveFromGroup(group)
                }
            }
        },
    }
})

const schema = new GraphQLSchema({
  query: queryType
})

export default schema;