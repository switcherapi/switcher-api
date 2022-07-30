const environment = {
    type: 'object',
    properties: {
        _id: {
            type: 'string',
            description: 'The unique identifier of the environment'
        },
        name: {
            type: 'string'
        },
        domain: {
            type: 'string',
            description: 'The domain ID parent of the environment',
            format: 'uuid'
        },
        owner: {
            type: 'uuid',
            description: 'The owner id of the environment'
        },
        createdAt: {
            type: 'string',
            description: 'The date when the environment was created'
        },
        updatedAt: {
            type: 'string',
            description: 'The date when the environment was updated'
        }
    }
};

export default {
    Environment: environment,
    EnvironmentCreateRequest: {
        type: 'object',
        properties: {
            name: {
                type: 'string'
            },
            domain: {
                type: 'string',
                description: 'The domain ID parent of the environment',
                format: 'uuid'
            }
        }
    }
};