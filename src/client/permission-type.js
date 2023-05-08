import { GraphQLObjectType, GraphQLString, GraphQLList } from 'graphql';

const elementPermissionsType = new GraphQLObjectType({
    name: 'permissions',
    fields: {
        action: {
            type: GraphQLString
        },
        result: {
            type: GraphQLString
        }
    }
});

export const permissionType = new GraphQLObjectType({
    name: 'permission',
    fields: {
        id: {
            type: GraphQLString
        },
        name: {
            type: GraphQLString
        },
        permissions: {
            type: new GraphQLList(elementPermissionsType)
        }
    }
});