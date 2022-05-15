import { pagination } from '../schemas/common';
import { commonArraySchemaContent, commonOneOfSchemaContent, commonSchemaContent } from './common';

export default {
    'config/create': {
        post: {
            tags: ['Config'],
            description: 'Config creation',
            security: [{ bearerAuth: [] }],
            requestBody: {
                content: commonSchemaContent('ConfigCreateRequest')
            },
            responses: {
                '201': {
                    description: 'Successful Config creation',
                    content: commonSchemaContent('Config')
                }
            }
        }
    },
    '/config/{id}': {
        get: {
            tags: ['Config'],
            description: 'Get Config by id',
            security: [{ bearerAuth: [] }],
            parameters: [{
                in: 'path',
                name: 'id',
                description: 'Config ID',
                schema: {
                    type: 'string'
                }
            }, {
                in: 'query',
                name: 'resolveComponents',
                description: 'Resolve components',
                schema: {
                    type: 'boolean'
                }
            }],
            responses: {
                '200': {
                    description: 'Success',
                    content: commonOneOfSchemaContent(['Config', 'ConfigComponentResolved'])
                }
            }
        },
        patch: {
            tags: ['Config'],
            description: 'Config update',
            security: [{ bearerAuth: [] }],
            parameters: [{
                in: 'path',
                name: 'id',
                description: 'Config ID',
                schema: {
                    type: 'string'
                }
            }],
            requestBody: {
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                key: {
                                    type: 'string',
                                    description: 'The name given to the Config Switcher'
                                },
                                description: {
                                    type: 'string',
                                    description: 'The description of the Config'
                                }
                            }
                        }
                    }
                }
            },
            responses: {
                '200': {
                    description: 'Successful Config update',
                    content: commonSchemaContent('Config')
                }
            }
        },
        delete: {
            tags: ['Config'],
            description: 'Delete Config',
            security: [{ bearerAuth: [] }],
            parameters: [{
                in: 'path',
                name: 'id',
                description: 'Config ID',
                schema: {
                    type: 'string'
                }
            }],
            responses: {
                '200': {
                    description: 'Success',
                    content: commonSchemaContent('Config')
                }
            }
        }
    },
    '/config/updateRelay/{id}': {
        patch: {
            tags: ['Config'],
            description: 'Config Relay update',
            security: [{ bearerAuth: [] }],
            parameters: [{
                in: 'path',
                name: 'id',
                description: 'Config ID',
                schema: {
                    type: 'string'
                }
            }],
            requestBody: {
                content: commonSchemaContent('Relay')
            },
            responses: {
                '200': {
                    description: 'Successful Config update',
                    content: commonSchemaContent('Config')
                }
            }
        }
    },
    '/config/updateStatus/{id}': {
        patch: {
            tags: ['Config'],
            description: 'Config environment update',
            security: [{ bearerAuth: [] }],
            parameters: [{
                in: 'path',
                name: 'id',
                description: 'Config ID',
                schema: {
                    type: 'string'
                }
            }],
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
                    description: 'Successful Config environment update',
                    content: commonSchemaContent('Config')
                }
            }
        }
    },
    '/config/removeStatus/{id}': {
        patch: {
            tags: ['Config'],
            description: 'Config environment remove',
            security: [{ bearerAuth: [] }],
            parameters: [{
                in: 'path',
                name: 'id',
                description: 'Config ID',
                schema: {
                    type: 'string'
                }
            }],
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
                    description: 'Successful Config environment remove',
                    content: commonSchemaContent('Config')
                }
            }
        }
    },
    '/config/addComponent/{id}': {
        patch: {
            tags: ['Config'],
            description: 'Config component add',
            security: [{ bearerAuth: [] }],
            parameters: [{
                in: 'path',
                name: 'id',
                description: 'Config ID',
                schema: {
                    type: 'string'
                }
            }],
            requestBody: {
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                component: {
                                    type: 'string',
                                    description: 'The Component ID'
                                }
                            }
                        }
                    }
                }
            },
            responses: {
                '200': {
                    description: 'Successful Config component add',
                    content: commonSchemaContent('Config')
                }
            }
        }
    },
    '/config/updateComponents/{id}': {
        patch: {
            tags: ['Config'],
            description: 'Config components update',
            security: [{ bearerAuth: [] }],
            parameters: [{
                in: 'path',
                name: 'id',
                description: 'Config ID',
                schema: {
                    type: 'string'
                }
            }],
            requestBody: {
                content: {
                    'application/json': {
                        schema: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    components: {
                                        type: 'string',
                                        description: 'The Component IDs'
                                    }
                                }
                            }
                        }
                    }
                }
            },
            responses: {
                '200': {
                    description: 'Successful Config components update',
                    content: commonSchemaContent('Config')
                }
            }
        }
    },
    '/config/removeComponent/{id}': {
        patch: {
            tags: ['Config'],
            description: 'Config component remove',
            security: [{ bearerAuth: [] }],
            parameters: [{
                in: 'path',
                name: 'id',
                description: 'Config ID',
                schema: {
                    type: 'string'
                }
            }],
            requestBody: {
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                component: {
                                    type: 'string',
                                    description: 'The Component ID'
                                }
                            }
                        }
                    }
                }
            },
            responses: {
                '200': {
                    description: 'Successful Config component remove',
                    content: commonSchemaContent('Config')
                }
            }
        }
    },
    '/config/removeRelay/{id}/{env}': {
        patch: {
            tags: ['Config'],
            description: 'Config Relay remove',
            security: [{ bearerAuth: [] }],
            parameters: [{
                in: 'path',
                name: 'id',
                description: 'Config ID',
                schema: {
                    type: 'string'
                }
            }, {
                in: 'path',
                name: 'env',
                description: 'Environment name',
                schema: {
                    type: 'string'
                }
            }],
            responses: {
                '200': {
                    description: 'Successful Config Relay remove',
                    content: commonSchemaContent('Config')
                }
            }
        }
    },
    '/config/spec/relay': {
        get: {
            tags: ['Config'],
            description: 'Get the relay specifications',
            security: [{ bearerAuth: [] }],
            responses: {
                '200': {
                    description: 'Success',
                    content: commonSchemaContent('ConfigRelaySpecResponse')
                }
            }
        }
    },
    '/config': {
        get: {
            tags: ['Config'],
            description: 'Get all Configs',
            security: [{ bearerAuth: [] }],
            parameters: [
                ...pagination,
            {
                in: 'query',
                name: 'group',
                description: 'Group ID',
                required: true,
                schema: {
                    type: 'string'
                }
            }],
            responses: {
                '200': {
                    description: 'Success',
                    content: commonArraySchemaContent('Config')
                }
            }
        }
    },
    '/config/history/{id}': {
        get: {
            tags: ['Config'],
            description: 'Get Config history',
            security: [{ bearerAuth: [] }],
            parameters: [...pagination],
            responses: {
                '200': {
                    description: 'Success',
                    content: commonArraySchemaContent('History')
                }
            }
        },
        delete: {
            tags: ['Config'],
            description: 'Delete Config history',
            security: [{ bearerAuth: [] }],
            responses: {
                '200': {
                    description: 'Success',
                    content: commonSchemaContent('Config')
                }
            }
        }
    }
};