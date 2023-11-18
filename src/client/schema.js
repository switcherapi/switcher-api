import { GraphQLSchema, GraphQLObjectType, GraphQLString, GraphQLList, GraphQLBoolean, GraphQLNonNull } from 'graphql';
import { domainType, flatConfigurationType } from './configuration-type';
import { strategyInputType, criteriaType } from './criteria-type';
import { resolveConfigByKey, resolveDomain } from './resolvers';
import { resolveConfiguration } from './configuration-resolvers';
import { permissionType } from './permission-type';
import { resolvePermission } from './permission-resolvers';

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
                },
                bypassMetric: {
                    type: GraphQLBoolean
                }
            },
            resolve: async (_source, { key, entry, bypassMetric }, context) => {
                context.entry = entry;
                context.bypassMetric = bypassMetric;
                return resolveConfigByKey(context.domain, key);
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
                    type: GraphQLBoolean
                },
                environment: {
                    type: GraphQLString
                },
                _component: {
                    type: GraphQLString
                }
            },
            resolve: async (_source, { _id, name, activated, environment, _component }, context) => {
                if (environment) context.environment = environment;
                if (_component) context._component = _component;
                return resolveDomain(_id, name, activated, context);
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
                group_id: {
                    type: GraphQLString
                },
                key: {
                    type: GraphQLString
                },
                config_id: {
                    type: GraphQLString
                },
                environment: {
                    type: GraphQLString
                },
                slack_team_id: {
                    type: GraphQLString
                }
            },
            resolve: async (_source, args, context) => {
                return resolveConfiguration(args, context);
            }
        },
        permission: {
            type: new GraphQLList(permissionType),
            args: {
                domain: {
                    type: GraphQLString
                },
                parent: {
                    type: GraphQLString
                },
                actions: {
                    type: new GraphQLList(GraphQLString)
                },
                router: {
                    type: GraphQLString
                },
                environment: {
                    type: GraphQLString
                }
            },
            resolve: async (_source, args, context) => {
                return resolvePermission(args, context.admin);
            }
        }
    }
});

const schema = new GraphQLSchema({
  query: queryType
});

export default schema;