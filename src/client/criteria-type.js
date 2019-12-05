import { domainType, groupConfigType, strategyType } from './configuration-type';
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
            type: GraphQLBoolean
        },
        result: {
            type: resultType,
            resolve: (source, params, context) => {
                return resolveCriteria(source, context)
            }
        }
    }
})