const adminSchemaContent = {
    'application/json': {
        schema: {
            $ref: '#/components/schemas/Admin'
        }
    }
};

export default {
    '/admin/signup': {
        post: {
            tags: ['Admin'],
            description: 'Admin signup',
            requestBody: {
                content: {
                    'application/json': {
                        schema: {
                            $ref: '#/components/schemas/AdminSignupRequest'
                        }
                    }
                }
            },
            responses: {
                '201': {
                    description: 'Admin signup',
                    content: adminSchemaContent
                }
            }
        }
    },
    '/admin/login': {
        post: {
            tags: ['Admin'],
            description: 'Authenticate user using internal API credentials',
            requestBody: {
                content: {
                    'application/json': {
                        schema: {
                            $ref: '#/components/schemas/AdminLoginRequest'
                        }
                    }
                }
            },
            responses: {
                '200': {
                    description: 'Success',
                    content: {
                        'application/json': {
                            schema: {
                                $ref: '#/components/schemas/AdminLoginResponse'
                            }
                        }
                    }
                }
            }
        }
    },
    '/admin/me': {
        get: {
            tags: ['Admin'],
            description: 'Get the current admin',
            security: [
                {
                    bearerAuth: []
                }
            ],
            responses: {
                '200': {
                    description: 'Success',
                    content: adminSchemaContent
                }
            }
        },
        delete: {
            tags: ['Admin'],
            description: 'Delete the current admin',
            security: [
                {
                    bearerAuth: []
                }
            ],
            responses: {
                '200': {
                    description: 'Success',
                    content: adminSchemaContent
                }
            }
        }
    }
};