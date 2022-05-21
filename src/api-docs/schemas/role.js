import { ActionTypes, KeyTypes, RouterTypes } from '../../models/role';

const role = {
    type: 'object',
    properties: {
        action: {
            type: 'string',
            enum: Object.values(ActionTypes)
        },
        active: {
            type: 'boolean'
        },
        router: {
            type: 'string',
            enum: Object.values(RouterTypes)
        },
        identifiedBy: {
            type: 'string',
            enum: Object.values(KeyTypes)
        },
        values: {
            type: 'array',
            items: {
                type: 'string'
            }
        }
    }
};

export default {
    Role: role,
    RoleUpdateRequest: {
        type: 'object',
        properties: {
            action: {
                type: 'string',
                enum: Object.values(ActionTypes)
            },
            active: {
                type: 'boolean'
            },
            router: {
                type: 'string',
                enum: Object.values(RouterTypes)
            },
            identifiedBy: {
                type: 'string',
                enum: Object.values(KeyTypes)
            }
        }
    }
};