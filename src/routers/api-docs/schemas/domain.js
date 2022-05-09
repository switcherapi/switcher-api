export const domain = {
    type: 'object',
    properties: {
        _id: {
            type: 'string',
            description: 'The unique identifier of the domain'
        },
        integrations: {
            type: 'obejct',
            properties: {
                slack: {
                    type: 'string',
                    description: 'The slack integration id'
                }
            }
        },
        name: {
            type: 'string',
            description: 'The name of the domain'
        },
        description: {
            type: 'string',
            description: 'The description of the domain'
        },
        activated: {
            type: 'object',
            properties: {
                environment: {
                    type: 'boolean',
                    description: 'The environment is activated'
                }
            }
        },
        owner: {
            type: 'string',
            description: 'The owner id of the domain'
        },
        transfer: {
            type: 'boolean',
            description: 'The domain is set to be transferred'
        },
        createdAt: {
            type: 'string',
            description: 'The date when the domain was created'
        },
        updatedAt: {
            type: 'string',
            description: 'The date when the domain was updated'
        }
    }
};

export default {
    Domain: domain,
};