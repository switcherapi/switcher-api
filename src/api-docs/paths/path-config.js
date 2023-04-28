import { pagination, pathParameter, queryParameter } from '../schemas/common';
import { commonArraySchemaContent, commonOneOfSchemaContent, commonSchemaContent } from './common';

export default {
    '/config/create': {
        post: {
            tags: ['Config'],
            description: 'Config creation',
            security: [{ bearerAuth: [] }],
            requestBody: {
                content: commonSchemaContent('ConfigCreateRequest')
            },
            responses: {
                '201': {
                    description: 'Config created',
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
            parameters: [
                pathParameter('id', 'Config ID', true),
                queryParameter('resolveComponents', 'Resolve components', false, 'boolean')
            ],
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
            parameters: [
                pathParameter('id', 'Config ID', true)
            ],
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
                    description: 'Config updated',
                    content: commonSchemaContent('Config')
                }
            }
        },
        delete: {
            tags: ['Config'],
            description: 'Delete Config',
            security: [{ bearerAuth: [] }],
            parameters: [
                pathParameter('id', 'Config ID', true)
            ],
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
            parameters: [
                pathParameter('id', 'Config ID', true)
            ],
            requestBody: {
                content: commonSchemaContent('Relay')
            },
            responses: {
                '200': {
                    description: 'Config updated',
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
            parameters: [
                pathParameter('id', 'Config ID', true)
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
                    description: 'Config environment updated',
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
            parameters: [
                pathParameter('id', 'Config ID', true)
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
                    description: 'Config environment removed',
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
            parameters: [
                pathParameter('id', 'Config ID', true)
            ],
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
                    description: 'Config component added',
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
            parameters: [
                pathParameter('id', 'Config ID', true)
            ],
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
                    description: 'Config components updated',
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
            parameters: [
                pathParameter('id', 'Config ID', true)
            ],
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
                    description: 'Config component removed',
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
            parameters: [
                pathParameter('id', 'Config ID', true),
                pathParameter('env', 'Environment name', true)
            ],
            responses: {
                '200': {
                    description: 'Config Relay removed',
                    content: commonSchemaContent('Config')
                }
            }
        }
    },
    '/config/relay/verificationCode/{id}': {
        patch: {
            tags: ['Config'],
            description: 'Config Relay generates verification code',
            security: [{ bearerAuth: [] }],
            parameters: [
                pathParameter('id', 'Config ID', true)
            ],
            responses: {
                '200': {
                    description: 'Config Relay verification code generated',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    code: {
                                        type: 'string',
                                        description: 'Verification code'
                                    }
                                }
                            }
                        }
                    }
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
                queryParameter('group', 'Group ID', true)
            ],
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