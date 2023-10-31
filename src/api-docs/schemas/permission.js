import { ActionTypes, KeyTypes, RouterTypes } from '../../models/permission';

const permission = {
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
        enviroments: {
            type: 'array',
            items: {
                type: 'string'
            }
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
    Permission: permission,
    PermissionUpdateRequest: {
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
            enviroments: {
                type: 'array',
                items: {
                    type: 'string'
                }
            },
            identifiedBy: {
                type: 'string',
                enum: Object.values(KeyTypes)
            }
        }
    }
};