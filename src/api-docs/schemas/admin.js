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
        auth_provider: {
            type: 'string',
            enum: ['email', 'github', 'bitbucket'],
            description: 'Authentication provider used'
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

export const jwt = {
    type: 'object',
    properties: {
        token: {
            type: 'string',
            description: 'The JWT token'
        },
        refreshToken: {
            type: 'string',
            description: 'The JWT refresh token'
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
    AdminUpdateRequest: {
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
            }
        }
    },
    AdminLoginResponse: {
        type: 'object',
        properties: {
            admin,
            jwt
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
    AdminPermissionReadRequest: {
        type: 'object',
        properties: {
            domain: {
                type: 'string'
            },
            action: {
                type: 'array',
                items: {
                    type: 'string',
                    enum: ['READ', 'CREATE', 'UPDATE', 'DELETE']
                }
            },
            router: {
                type: 'string',
                enum: ['DOMAIN', 'GROUP', 'CONFIG', 'STRATEGY', 'ALL']
            },
            element: {
                type: 'object',
                properties: {
                    name: {
                        type: 'string'
                    }
                }
            },
            environment: {
                type: 'string'
            }
        }
    },
    AdminPermissionReadResponse: {
        type: 'array',
        items: {
            type: 'object',
            properties: {
                action: {
                    type: 'string',
                    enum: ['READ', 'CREATE', 'UPDATE', 'DELETE']
                },
                result: {
                    type: 'string',
                    enum: ['ok', 'nok']
                }
            }
        }
    }
};