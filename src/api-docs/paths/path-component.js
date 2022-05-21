import { pagination, pathParameter, queryParameter } from '../schemas/common';
import { commonArraySchemaContent, commonSchemaContent } from './common';

export default {
    '/component/create': {
        post: {
            tags: ['Component'],
            description: 'Create a new component',
            security: [{ bearerAuth: [] }],
            requestBody: {
                content: commonSchemaContent('ComponentCreateRequest')
            },
            responses: {
                201: {
                    description: 'Component created',
                    content: commonSchemaContent('Component')
                }
            }
        }
    },
    '/component/generateApiKey/:component/': {
        get: {
            tags: ['Component'],
            description: 'Generate an API key for a component',
            security: [{ bearerAuth: [] }],
            parameters: [
                pathParameter('component', 'Component ID', 'string', true)
            ],
            responses: {
                200: {
                    description: 'API key',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    apiKey: {
                                        type: 'string'
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    '/component': {
        get: {
            tags: ['Component'],
            description: 'Get all components',
            security: [{ bearerAuth: [] }],
            parameters: [
                queryParameter('domain', 'Domain ID', 'string', true),
                ...pagination
            ],
            responses: {
                200: {
                    description: 'Components',
                    content: commonArraySchemaContent('Component')
                }
            }
        }
    },
    '/component/:id': {
        get: {
            tags: ['Component'],
            description: 'Get a component',
            security: [{ bearerAuth: [] }],
            parameters: [
                pathParameter('id', 'Component ID', 'string', true)
            ],
            responses: {
                200: {
                    description: 'Component',
                    content: commonSchemaContent('Component')
                }
            }
        },
        patch: {
            tags: ['Component'],
            description: 'Update a component',
            security: [{ bearerAuth: [] }],
            parameters: [
                pathParameter('id', 'Component ID', 'string', true),
            ],
            requestBody: {
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                name: {
                                    type: 'string'
                                },
                                description: {
                                    type: 'string'
                                }
                            }
                        }
                    }
                }
            },
            responses: {
                200: {
                    description: 'Component',
                    content: commonSchemaContent('Component')
                }
            }
        },
        delete: {
            tags: ['Component'],
            description: 'Delete a component',
            security: [{ bearerAuth: [] }],
            parameters: [
                pathParameter('id', 'Component ID', 'string', true)
            ],
            responses: {
                200: {
                    description: 'Component',
                    content: commonSchemaContent('Component')
                }
            }
        }
    }
};