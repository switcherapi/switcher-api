import { pagination, pathParameter } from '../schemas/common.js';
import { commonArraySchemaContent, commonSchemaContent } from './common.js';

export default {
    '/domain/create': {
        post: {
            tags: ['Domain'],
            description: 'Domain creation',
            security: [{ bearerAuth: [] }],
            requestBody: {
                content: commonSchemaContent('DomainCreateRequest')
            },
            responses: {
                '201': {
                    description: 'Successful domain creation',
                    content: commonSchemaContent('Domain')
                }
            }
        }
    },
    '/domain/{id}': {
        get: {
            tags: ['Domain'],
            description: 'Get domain by id',
            security: [{ bearerAuth: [] }],
            parameters: [
                pathParameter('id', 'Domain ID', true)
            ],
            responses: {
                '200': {
                    description: 'Success',
                    content: commonSchemaContent('Domain')
                }
            }
        },
        patch: {
            tags: ['Domain'],
            description: 'Domain update',
            security: [{ bearerAuth: [] }],
            parameters: [
                pathParameter('id', 'Domain ID', true)
            ],
            requestBody: {
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                description: {
                                    type: 'string',
                                    description: 'The description of the domain'
                                }
                            }
                        }
                    }
                }
            },
            responses: {
                '200': {
                    description: 'Successful domain update',
                    content: commonSchemaContent('Domain')
                }
            }
        },
        delete: {
            tags: ['Domain'],
            description: 'Delete domain',
            security: [{ bearerAuth: [] }],
            parameters: [
                pathParameter('id', 'Domain ID', true)
            ],
            responses: {
                '200': {
                    description: 'Success',
                    content: commonSchemaContent('Domain')
                }
            }
        }
    },
    '/domain/transfer/request': {
        patch: {
            tags: ['Domain'],
            description: 'Domain transfer request',
            security: [{ bearerAuth: [] }],
            requestBody: {
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                domain: {
                                    type: 'string',
                                    description: 'Domain ID'
                                }
                            }
                        }
                    }
                }
            },
            responses: {
                '200': {
                    description: 'Successful domain transfer request',
                    content: commonSchemaContent('Domain')
                }
            }
        }
    },
    '/domain/transfer/accept': {
        patch: {
            tags: ['Domain'],
            description: 'Domain transfer accept',
            security: [{ bearerAuth: [] }],
            requestBody: {
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                domain: {
                                    type: 'string',
                                    description: 'Domain ID'
                                }
                            }
                        }
                    }
                }
            },
            responses: {
                '200': {
                    description: 'Successful domain transfer accept',
                    content: commonSchemaContent('Domain')
                }
            }
        }
    },
    '/domain/updateStatus/{id}': {
        patch: {
            tags: ['Domain'],
            description: 'Domain environment update',
            security: [{ bearerAuth: [] }],
            parameters: [
                pathParameter('id', 'Domain ID', true)
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
                    description: 'Successful domain environment update',
                    content: commonSchemaContent('Domain')
                }
            }
        }
    },
    '/domain/removeStatus/{id}': {
        patch: {
            tags: ['Domain'],
            description: 'Domain environment remove',
            security: [{ bearerAuth: [] }],
            parameters: [
                pathParameter('id', 'Domain ID', true)
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
                    description: 'Successful domain environment remove',
                    content: commonSchemaContent('Domain')
                }
            }
        }
    },
    '/domain': {
        get: {
            tags: ['Domain'],
            description: 'Get all domains',
            security: [{ bearerAuth: [] }],
            parameters: [...pagination],
            responses: {
                '200': {
                    description: 'Success',
                    content: commonSchemaContent('Domain')
                }
            }
        }
    },
    '/doamin/collaboration': {
        get: {
            tags: ['Domain'],
            description: 'Get domains for collaboration',
            security: [{ bearerAuth: [] }],
            responses: {
                '200': {
                    description: 'Success',
                    content: commonArraySchemaContent('Domain')
                }
            }
        }
    },
    '/domain/history/{id}': {
        get: {
            tags: ['Domain'],
            description: 'Get domain history',
            security: [{ bearerAuth: [] }],
            parameters: [
                pathParameter('id', 'Domain ID', true),
                ...pagination
            ],
            responses: {
                '200': {
                    description: 'Success',
                    content: commonArraySchemaContent('History')
                }
            }
        },
        delete: {
            tags: ['Domain'],
            description: 'Delete domain history',
            security: [{ bearerAuth: [] }],
            parameters: [
                pathParameter('id', 'Domain ID', true)
            ],
            responses: {
                '200': {
                    description: 'Success',
                    content: commonSchemaContent('Domain')
                }
            }
        }
    },
    '/domain/relay/verificationCode/{id}': {
        patch: {
            tags: ['Domain'],
            description: 'Generates verification code for Relay integration',
            security: [{ bearerAuth: [] }],
            parameters: [
                pathParameter('id', 'Domain ID', true)
            ],
            responses: {
                '200': {
                    description: 'Relay verification code generated',
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
};