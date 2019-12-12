import { domainType, groupConfigType, strategyType } from './configuration-type';
import { EnvType } from '../models/environment';
import { resolveCriteria } from './resolvers';
import { GraphQLObjectType, GraphQLString, GraphQLList, GraphQLBoolean, GraphQLNonNull, GraphQLInputObjectType } from 'graphql';

export const strategyInputType = new GraphQLInputObjectType({
    name: 'StrategyInput',
    fields: {
        strategy: {
            type: new GraphQLNonNull(GraphQLString)
        },
        input: {
            type: new GraphQLNonNull(GraphQLString)
        }
    }
})

export const resultType = new GraphQLObjectType({
    name: 'Result',
    fields: {
        return: {
            type: GraphQLBoolean  
        },
        reason: {
            type: GraphQLString
        },
        domain: {
            type: domainType
        },
        group: {
            type: groupConfigType
        },
        strategies: {
            type: new GraphQLList(strategyType)
        }
    }
})

export const criteriaType = new GraphQLObjectType({
    name: 'Criteria',
    fields: {
        key: {
            type: GraphQLString
        },
        activated: {
            type: GraphQLBoolean,
            resolve: (source, args, { environment }) => {
                return source.activated.get(environment) === undefined ? 
                    source.activated.get(EnvType.DEFAULT) : source.activated.get(environment)
            }
        },
        result: {
            type: resultType,
            resolve: (source, params, context) => {
                return resolveCriteria(source, context, 'values description strategy operation activated -_id')
            }
        }
    }
})