import { OperationsType, StrategiesType } from '../../models/config-strategy';
import { pagination, pathParameter, queryParameter } from '../schemas/common';
import { commonArraySchemaContent, commonSchemaContent } from './common';

export default {
    '/configstrategy/create': {
        post: {
            tags: ['ConfigStrategy'],
            description: 'Create a new config strategy',
            security: [{ 'bearerAuth': [] }],
            requestBody: {
                content: commonSchemaContent('ConfigStrategyCreateRequest')
            },
            responses: {
                201: {
                    description: 'Config Strategy created',
                    content: commonSchemaContent('ConfigStrategy')
                }
            }
        }
    },
    '/configstrategy': {
        get: {
            tags: ['ConfigStrategy'],
            description: 'Get all Config Strategies',
            security: [{ 'bearerAuth': [] }],
            parameters: [
                ...pagination,
                queryParameter('config', 'Config ID', true),
                queryParameter('env', 'Environment', false)
            ],
            responses: {
                200: {
                    description: 'Success',
                    content: commonArraySchemaContent('ConfigStrategy')
                }
            }
        }
    },
    '/configstrategy/{id}': {
        get: {
            tags: ['ConfigStrategy'],
            description: 'Get a Config Strategy',
            security: [{ 'bearerAuth': [] }],
            parameters: [
                pathParameter('id', 'Config Strategy ID', true)
            ],
            responses: {
                200: {
                    description: 'Success',
                    content: commonSchemaContent('ConfigStrategy')
                }
            }
        },
        delete: {
            tags: ['ConfigStrategy'],
            description: 'Delete a Config Strategy',
            security: [{ 'bearerAuth': [] }],
            parameters: [
                pathParameter('id', 'Config Strategy ID', true)
            ],
            responses: {
                200: {
                    description: 'Success',
                    content: commonSchemaContent('ConfigStrategy')
                }
            }
        },
        patch: {
            tags: ['ConfigStrategy'],
            description: 'Update a Config Strategy',
            security: [{ 'bearerAuth': [] }],
            parameters: [
                pathParameter('id', 'Config Strategy ID', true)
            ],
            requestBody: {
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                description: {
                                    type: 'string'
                                },
                                values: {
                                    type: 'array',
                                    items: {
                                        type: 'string'
                                    }
                                },
                                operation: {
                                    type: 'string',
                                    enum: Object.values(OperationsType)
                                }
                            }
                        }
                    }
                }
            },
            responses: {
                200: {
                    description: 'Success',
                    content: commonSchemaContent('ConfigStrategy')
                }
            }
        }
    },
    '/configstrategy/history/{id}': {
        get: {
            tags: ['ConfigStrategy'],
            description: 'Get a Config Strategy history',
            security: [{ 'bearerAuth': [] }],
            parameters: [
                pathParameter('id', 'Config Strategy ID', true),
                ...pagination
            ],
            responses: {
                200: {
                    description: 'Success',
                    content: commonArraySchemaContent('History')
                }
            }
        },
        delete: {
            tags: ['ConfigStrategy'],
            description: 'Delete Config Strategy history',
            security: [{ 'bearerAuth': [] }],
            parameters: [
                pathParameter('id', 'Config Strategy ID', true)
            ],
            responses: {
                200: {
                    description: 'Success',
                    content: commonSchemaContent('ConfigStrategy')
                }
            }
        }
    },
    '/configstrategy/req/{strategy}': {
        get: {
            tags: ['ConfigStrategy'],
            description: 'Get Config Strategy requirements specification',
            security: [{ 'bearerAuth': [] }],
            parameters: [
                {
                    in: 'path',
                    name: 'strategy',
                    description: 'Config Strategy type',
                    required: true,
                    schema: {
                        type: 'string',
                        enum: Object.values(StrategiesType)
                    }, 
                }],
            responses: {
                200: {
                    description: 'Success',
                    content: commonSchemaContent('ConfigStrategyReqResponse')
                }
            }
        }
    },
    '/configstrategy/spec/strategies': {
        get: {
            tags: ['ConfigStrategy'],
            description: 'Get Config Strategy strategies types',
            security: [{ 'bearerAuth': [] }],
            responses: {
                200: {
                    description: 'Success',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    strategiesAvailable: {
                                        type: 'array',
                                        items: {
                                            type: 'string',
                                            enum: Object.values(StrategiesType)
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    '/configstrategy/addval/{id}': {
        patch: {
            tags: ['ConfigStrategy'],
            description: 'Add a value to a Config Strategy',
            security: [{ 'bearerAuth': [] }],
            parameters: [
                pathParameter('id', 'Config Strategy ID', true)
            ],
            requestBody: {
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                value: {
                                    type: 'string'
                                }
                            }
                        }
                    }
                }
            },
            responses: {
                200: {
                    description: 'Success',
                    content: commonSchemaContent('ConfigStrategy')
                }
            }
        }
    },
    '/configstrategy/updateval/{id}': {
        patch: {
            tags: ['ConfigStrategy'],
            description: 'Update a value of a Config Strategy',
            security: [{ 'bearerAuth': [] }],
            parameters: [
                pathParameter('id', 'Config Strategy ID', true)
            ],
            requestBody: {
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                oldvalue: {
                                    type: 'string'
                                },
                                newvalue: {
                                    type: 'string'
                                }
                            }
                        }
                    }
                }
            },
            responses: {
                200: {
                    description: 'Success',
                    content: commonSchemaContent('ConfigStrategy')
                }
            }
        }
    },
    '/configstrategy/removeval/{id}': {
        patch: {
            tags: ['ConfigStrategy'],
            description: 'Remove a value of a Config Strategy',
            security: [{ 'bearerAuth': [] }],
            parameters: [
                pathParameter('id', 'Config Strategy ID', true)
            ],
            requestBody: {
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                value: {
                                    type: 'string'
                                }
                            }
                        }
                    }
                }
            },
            responses: {
                200: {
                    description: 'Success',
                    content: commonSchemaContent('ConfigStrategy')
                }
            }
        }
    },
    '/configstrategy/values/{id}': {
        get: {
            tags: ['ConfigStrategy'],
            description: 'Get a Config Strategy values',
            security: [{ 'bearerAuth': [] }],
            parameters: [
                pathParameter('id', 'Config Strategy ID', true),
                ...pagination
            ],
            responses: {
                200: {
                    description: 'Success',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'array',
                                items: {
                                    type: 'string'
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    '/configstrategy/updateStatus/{id}': {
        patch: {
            tags: ['ConfigStrategy'],
            description: 'Update a Config Strategy status',
            security: [{ 'bearerAuth': [] }],
            parameters: [
                pathParameter('id', 'Config Strategy ID', true)
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
                200: {
                    description: 'Success',
                    content: commonSchemaContent('ConfigStrategy')
                }
            }
        }
    }
};