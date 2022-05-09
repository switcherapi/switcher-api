export const admin = {
    type: 'object',
    properties: {
        _id: {
            type: 'string',
            description: 'The unique identifier of the admin'
        },
        name: {
            type: 'string',
            description: 'The name of the admin'
        },
        email: {
            type: 'string',
            description: 'The email of the admin'
        },
        active: {
            type: 'boolean',
            description: 'Whether the admin is active or not'
        },
        teams: {
            type: 'array',
            items: {
                type: 'string',
                description: 'Teams that the admin is a member of'
            }
        },
        created_at: {
            type: 'string',
            description: 'The date when the admin was created'
        },
        updated_at: {
            type: 'string',
            description: 'The date when the admin was updated'
        }
    }
};

export default {
    Admin: admin,
    AdminLoginRequest: {
        type: 'object',
        properties: {
            email: {
                type: 'string',
                format: 'email'
            },
            password: {
                type: 'string'
            }
        }
    },
    AdminLoginResponse: {
        type: 'object',
        properties: {
            admin,
            jwt: {
                type: 'string'
            }
        }
    },
    AdminSignupRequest: {
        type: 'object',
        properties: {
            name: {
                type: 'string'
            },
            email: {
                type: 'string',
                format: 'email'
            },
            password: {
                type: 'string'
            },
            token: {
                type: 'string'
            }
        }
    },
};