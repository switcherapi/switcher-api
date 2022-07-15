import { GraphQLSchema, GraphQLObjectType, GraphQLString, GraphQLList, GraphQLBoolean, GraphQLNonNull } from 'graphql';
import { domainType, flatConfigurationType } from './configuration-type';
import { EnvType } from '../models/environment';
import { strategyInputType, criteriaType } from './criteria-type';
import { resolveConfigByKey, resolveDomain } from './resolvers';
import { resolveConfiguration } from './configuration-resolvers';

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
                    type: GraphQLBoolean,
                    resolve: (source, _args, { environment }) => {
                        return source.activated.get(environment) === undefined ? 
                            source.activated.get(EnvType.DEFAULT) : source.activated.get(environment);
                    }
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
    }
});

const schema = new GraphQLSchema({
  query: queryType
});

export default schema;