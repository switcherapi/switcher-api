import { pagination, pathParameter, queryParameter } from '../schemas/common.js';
import { commonArraySchemaContent, commonSchemaContent } from './common.js';

export default {
    '/environment/create': {
        post: {
            tags: ['Environment'],
            description: 'Create a new environment',
            security: [{ bearerAuth: [] }],
            requestBody: {
                content: commonSchemaContent('EnvironmentCreateRequest')
            },
            responses: {
                201: {
                    description: 'Environment created',
                    content: commonSchemaContent('Environment')
                }
            }
        }
    },
    '/environment': {
        get: {
            tags: ['Environment'],
            description: 'Get all environments',
            security: [{ bearerAuth: [] }],
            parameters: [
                queryParameter('domain', 'Domain ID', true, 'string'),
                ...pagination
            ],
            responses: {
                200: {
                    description: 'Environments',
                    content: commonArraySchemaContent('Environment')
                }
            }
        }
    },
    '/environment/{id}': {
        get: {
            tags: ['Environment'],
            description: 'Get an environment',
            security: [{ bearerAuth: [] }],
            parameters: [
                pathParameter('id', 'Environment ID', true)
            ],
            responses: {
                200: {
                    description: 'Environment',
                    content: commonSchemaContent('Environment')
                }
            }
        },
        delete: {
            tags: ['Environment'],
            description: 'Delete an environment',
            security: [{ bearerAuth: [] }],
            parameters: [
                pathParameter('id', 'Environment ID', true)
            ],
            responses: {
                200: {
                    description: 'Environment',
                    content: commonSchemaContent('Environment')
                }
            }
        }
    },
    '/environment/recover/{id}': {
        patch: {
            tags: ['Environment'],
            description: 'Recover an environment',
            security: [{ bearerAuth: [] }],
            parameters: [
                pathParameter('id', 'Environment ID', true)
            ],
            responses: {
                200: {
                    description: 'Environment',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    message: {
                                        type: 'string'
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
