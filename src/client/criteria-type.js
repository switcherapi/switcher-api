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
});

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
            type: new GraphQLList(strategyType)
        }
    }
});

export const criteriaType = new GraphQLObjectType({
    name: 'Criteria',
    fields: {
        key: {
            type: GraphQLString
        },
        activated: {
            type: GraphQLBoolean,
            resolve: (source, _args, { environment }) => {
                return source.activated[`${environment}`] === undefined ? 
                    source.activated[`${EnvType.DEFAULT}`] : source.activated[`${environment}`];
            }
        },
        response: {
            type: responseType,
            resolve: (source, _params, context) => {
                return resolveCriteria(source, context);
            }
        }
    }
});