import { GraphQLSchema, GraphQLObjectType, GraphQLString, GraphQLList, GraphQLBoolean } from 'graphql';
import { domainType, flatConfigurationType } from './configuration-type.js';
import { resolveDomain } from './resolvers.js';
import { resolveConfiguration } from './configuration-resolvers.js';
import { permissionType } from './permission-type.js';
import { resolvePermission } from './permission-resolvers.js';

const queryType = new GraphQLObjectType({
    name: 'Query',
    fields: {
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