import componentSchema from './component';

const configComponents = {
    type: 'array',
    description: 'The component IDs that can use the Swichter',
    items: {
        type: 'uuid'
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
        verification_code: {
            type: 'string',
            description: '10 character string used to verify Relay endpoint ownership'
        },
        verified: {
            type: 'boolean',
            description: 'Valid when true (default: false)'
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
            type: 'uuid',
            description: 'The owner id of the config'
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