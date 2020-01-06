import { domainType, groupConfigType, strategyType } from './configuration-type';
import { EnvType } from '../models/environment';
import { resolveCriteria } from './resolvers';
import { GraphQLObjectType, GraphQLString, GraphQLList, GraphQLBoolean, GraphQLNonNull, GraphQLInputObjectType } from 'graphql';

export const strategyInputType = new GraphQLInputObjectType({
    name: 'StrategyInput',
    fields: {
        strategy: {
            type: GraphQLNonNull(GraphQLString)
        },
        input: {
            type: GraphQLNonNull(GraphQLString)
        }
    }
})

export const responseType = new GraphQLObjectType({
    name: 'Result',
    fields: {
        result: {
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
            type: GraphQLList(strategyType)
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
                return source.activated[`${environment}`] === undefined ? 
                    source.activated[`${EnvType.DEFAULT}`] : source.activated[`${environment}`]
            }
        },
        response: {
            type: responseType,
            resolve: (source, params, context) => {
                return resolveCriteria(source, context)
            }
        }
    }
})