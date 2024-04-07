import { pagination, pathParameter, queryParameter } from '../schemas/common.js';
import { commonArraySchemaContent, commonSchemaContent } from './common.js';

export default {
    '/groupconfig/create': {
        post: {
            tags: ['GroupConfig'],
            description: 'Create a new group config',
            security: [{ bearerAuth: [] }],
            requestBody: {
                content: commonSchemaContent('GroupConfigCreateRequest')
            },
            responses: {
                201: {
                    description: 'Group Config created',
                    content:  commonSchemaContent('GroupConfig')
                }
            }
        }
    },
    '/groupconfig': {
        get: {
            tags: ['GroupConfig'],
            description: 'Get all group configs',
            security: [{ bearerAuth: [] }],
            parameters: [
                queryParameter('domain', 'Domain ID', true, 'string'),
                ...pagination
            ],
            responses: {
                200: {
                    description: 'Group configs',
                    content: commonArraySchemaContent('GroupConfig')
                }
            }
        }
    },
    '/groupconfig/{id}': {
        get: {
            tags: ['GroupConfig'],
            description: 'Get a group config',
            security: [{ bearerAuth: [] }],
            parameters: [
                pathParameter('id', 'GroupConfig ID', true)
            ],
            responses: {
                200: {
                    description: 'Group config',
                    content: commonSchemaContent('GroupConfig')
                }
            }
        },
        delete: {
            tags: ['GroupConfig'],
            description: 'Delete a group config',
            security: [{ bearerAuth: [] }],
            parameters: [
                pathParameter('id', 'GroupConfig ID', true)
            ],
            responses: {
                200: {
                    description: 'Group config deleted',
                    content: commonSchemaContent('GroupConfig')
                }
            }
        },
        patch: {
            tags: ['GroupConfig'],
            description: 'Update a group config',
            security: [{ bearerAuth: [] }],
            parameters: [
                pathParameter('id', 'GroupConfig ID', true)
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
                    description: 'Group Config updated',
                    content: commonSchemaContent('GroupConfig')
                }
            }
        }
    },
    '/groupconfig/history/{id}': {
        get: {
            tags: ['GroupConfig'],
            description: 'Get a Group Config history',
            security: [{ bearerAuth: [] }],
            parameters: [
                pathParameter('id', 'GroupConfig ID', true),
                ...pagination
            ],
            responses: {
                200: {
                    description: 'Group Config history',
                    content: commonArraySchemaContent('History')
                }
            }
        },
        delete: {
            tags: ['GroupConfig'],
            description: 'Delete a group config history',
            security: [{ bearerAuth: [] }],
            parameters: [
                pathParameter('id', 'GroupConfig ID', true)
            ],
            responses: {
                200: {
                    description: 'Group config history deleted',
                    content: commonSchemaContent('GroupConfig')
                }
            }
        }
    },
    '/groupconfig/updateStatus/{id}': {
        patch: {
            tags: ['GroupConfig'],
            description: 'Group Config environment update',
            security: [{ bearerAuth: [] }],
            parameters: [
                pathParameter('id', 'Group Config ID', true)
            ],
            requestBody: {
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            additionalProperties: {
                                type: 'boolean',
                                description: 'The environment status'
                            }
                        }
                    }
                }
            },
            responses: {
                '200': {
                    description: 'Group Config environment updated',
                    content: commonSchemaContent('GroupConfig')
                }
            }
        }
    },
    '/groupconfig/removeStatus/{id}': {
        patch: {
            tags: ['GroupConfig'],
            description: 'Group Config environment remove',
            security: [{ bearerAuth: [] }],
            parameters: [
                pathParameter('id', 'GroupConfig ID', true)
            ],
            requestBody: {
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                env: {
                                    type: 'string',
                                    description: 'The environment name'
                                }
                            }
                        }
                    }
                }
            },
            responses: {
                '200': {
                    description: 'Group Config environment removed',
                    content: commonSchemaContent('GroupConfig')
                }
            }
        }
    }
};