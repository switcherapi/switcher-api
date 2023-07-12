export default {
    '/api-management/feature': {
        post: {
            tags: ['API Management'],
            description: 'Run feature validation',
            security: [{ appAuth: [] }],
            requestBody: {
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                feature: {
                                    type: 'string'
                                },
                                parameters: {
                                    type: 'object'
                                }
                            }
                        }
                    }
                }
            },
            responses: {
                200: {
                    description: 'Success',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    status: {
                                        type: 'boolean'
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    }
};