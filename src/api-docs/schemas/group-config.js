const groupConfig = {
    type: 'object',
    properties: {
        _id: {
            type: 'string',
            description: 'The unique identifier of the group config'
        },
        name: {
            type: 'string'
        },
        description: {
            type: 'string'
        },
        activated: {
            type: 'object',
            additionalProperties: {
                type: 'boolean',
                description: 'The environment status'
            }
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
                    description: 'The name of the admin who created the group config'
                }
            }
        },
        createdAt: {
            type: 'string',
            description: 'The date when the group config was created'
        },
        updatedAt: {
            type: 'string',
            description: 'The date when the group config was updated'
        }
    }
};

export default {
    GroupConfig: groupConfig,
    GroupConfigCreateRequest: groupConfig
};