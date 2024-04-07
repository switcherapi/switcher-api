import componentSchema from './component.js';

const configComponents = {
    type: 'array',
    description: 'The component IDs that can use the Swichter',
    items: {
        type: 'string'
    }
};

export const relay = {
    type: 'object',
    properties: {
        type: {
            type: 'string',
            enum: ['VALIDATION', 'NOTIFICATION']
        },
        description: {
            type: 'string'
        },
        activated: {
            type: 'object',
            additionalProperties: {
                type: 'boolean'
            }
        },
        endpoint: {
            type: 'object',
            additionalProperties: {
                type: 'string'
            }
        },
        method: {
            type: 'string',
            enum: ['GET', 'POST']
        },
        auth_prefix: {
            type: 'string'
        },
        auth_token: {
            type: 'object',
            additionalProperties: {
                type: 'string'
            }
        },
        verified: {
            type: 'object',
            additionalProperties: {
                type: 'boolean'
            },
            description: 'Defines when Relay endpoint is verified'
        }
    }
};

export const config = (components) => ({
    type: 'object',
    properties: {
        _id: {
            type: 'string',
            description: 'The unique identifier of the config'
        },
        key: {
            type: 'string',
            description: 'The name given to the config Switcher'
        },
        description: {
            type: 'string',
            description: 'The description of the config'
        },
        activated: {
            type: 'object',
            additionalProperties: {
                type: 'boolean',
                description: 'The environment status'
            }
        },
        components,
        group: {
            type: 'string',
            description: 'The group ID parent of the config',
            format: 'uuid'
        },
        domain: {
            type: 'string',
            description: 'The domain ID parent of the config',
            format: 'uuid'
        },
        owner: {
            type: 'string',
            description: 'The owner id of the config'
        },
        admin: {
            type: 'object',
            properties: {
                _id: {
                    type: 'string',
                    description: 'The unique identifier of the admin'
                },
                name: {
                    type: 'string',
                    description: 'The name of the admin who created the config'
                }
            }
        },
        disable_metrics: {
            type: 'object',
            additionalProperties: {
                type: 'boolean',
                description: 'The environment in which the metrics are disabled'
            }
        },
        relay,
        createdAt: {
            type: 'string',
            description: 'The date when the config was created'
        },
        updatedAt: {
            type: 'string',
            description: 'The date when the config was updated'
        }
    }
});

export default {
    Config: config(configComponents),
    ConfigComponentResolved: config(componentSchema.Component),
    Relay: relay,
    ConfigRelaySpecResponse: {
        type: 'object',
        properties: {
            methods: {
                type: 'array',
                description: 'The methods that can be used to call the relay',
                items: {
                    type: 'string',
                    enum: ['GET', 'POST']
                }
            },
            types: {
                type: 'array',
                description: 'The types of the relay',
                items: {
                    type: 'string',
                    enum: ['VALIDATION', 'NOTIFICATION']
                }
            }
        }
    },
    ConfigCreateRequest: {
        type: 'object',
        properties: {
            key: {
                type: 'string',
                description: 'The name given to the config Switcher'
            },
            description: {
                type: 'string',
                description: 'The description of the config'
            },
            group: {
                type: 'string',
                description: 'The group ID parent of the config',
                format: 'uuid'
            }
        }
    }
};