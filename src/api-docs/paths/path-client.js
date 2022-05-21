import { StrategiesType } from '../../models/config-strategy';
import { pathParameter, queryParameter } from '../schemas/common';
import configStrategy from '../schemas/config-strategy';

export default {
    '/criteria': {
        post: {
            tags: ['Client API'],
            description: 'Execute criteria query against the API settings',
            security: [{ appAuth: [] }],
            parameters: [
                queryParameter('key', 'string', 'Switcher Key', true),
                queryParameter('showReason', 'boolean', 'Show criteria execution reason (default: true)', false),
                queryParameter('showStrategy', 'boolean', 'Show criteria execution strategy (default: true)', false),
                queryParameter('bypassMetric', 'boolean', 'Bypass metric check (default: true)', false)
            ],
            requestBody: {
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                entry: {
                                    type: 'array',
                                    items: {
                                        type: 'object',
                                        properties: {
                                            strategy: {
                                                type: 'string',
                                                enum: Object.values(StrategiesType)
                                            },
                                            input: {
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
            responses: {
                200: {
                    description: 'Success',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    result: {
                                        type: 'boolean'
                                    },
                                    reason: {
                                        type: 'string'
                                    },
                                    strategies: {
                                        type: 'array',
                                        items: configStrategy
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    '/criteria/snapshot_check/:version': {
        get: {
            tags: ['Client API'],
            description: 'Check if snapshot version is up to date',
            security: [{ appAuth: [] }],
            parameters: [
                pathParameter('version', 'string', 'Snapshot version', true)
            ],
            responses: {
                200: {
                    description: 'Success',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    status: {
                                        type: 'boolean',
                                        description: 'true if snapshot version is up to date'
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    '/criteria/switchers_check': {
        post: {
            tags: ['Client API'],
            description: 'Check if switcher keys are valid',
            security: [{ appAuth: [] }],
            requestBody: {
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                switchers: {
                                    type: 'array',
                                    items: {
                                        type: 'string'
                                    }
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
                                    not_found: {
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
            }
        }
    },
    '/criteria/auth': {
        post: {
            tags: ['Client API'],
            description: 'Authenticate component',
            security: [{ apiKey: [] }],
            requestBody: {
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                domain: {
                                    type: 'string',
                                    description: 'Domain name'
                                },
                                component: {
                                    type: 'string',
                                    description: 'Component name'
                                },
                                enviroment: {
                                    type: 'string',
                                    description: 'Enviroment name'
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
                                    token: {
                                        type: 'string',
                                        description: 'Authentication token'
                                    },
                                    exp: {
                                        type: 'number',
                                        description: 'Expiration time'
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








