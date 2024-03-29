export const domain = {
    type: 'object',
    properties: {
        _id: {
            type: 'string',
            description: 'The unique identifier of the domain'
        },
        integrations: {
            type: 'object',
            properties: {
                slack: {
                    type: 'string',
                    description: 'The slack integration id'
                },
                relay: {
                    type: 'object',
                    properties: {
                        verification_code: {
                            type: 'string',
                            description: 'Generated string used to verify Relay ownership'
                        }
                    }
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
            additionalProperties: {
                type: 'boolean',
                description: 'The environment status'
            }
        },
        owner: {
            type: 'string',
            description: 'The owner id of the domain'
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
                    description: 'The name of the admin who created the domain'
                }
            }
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
    DomainCreateRequest: {
        type: 'object',
        properties: {
            name: {
                type: 'string',
                description: 'The name of the domain'
            },
            description: {
                type: 'string',
                description: 'The description of the domain'
            }
        }
    }
};