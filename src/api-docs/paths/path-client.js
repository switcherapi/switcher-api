import { StrategiesType } from '../../models/config-strategy.js';
import { pathParameter, queryParameter } from '../schemas/common.js';
import configStrategy from '../schemas/config-strategy.js';

export default {
    '/criteria': {
        post: {
            tags: ['Client API'],
            description: 'Execute criteria query against the API settings',
            security: [{ componentAuth: [] }],
            parameters: [
                queryParameter('key', 'Switcher Key', true, 'string'),
                queryParameter('showReason', 'Show criteria execution reason (default: true)', false, 'boolean'),
                queryParameter('showStrategy', 'Show criteria execution strategy (default: true)', false, 'boolean'),
                queryParameter('bypassMetric', 'Bypass metric check (default: true)', false, 'boolean')
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
                                    metadata: {
                                        type: 'object'
                                    },
                                    strategies: {
                                        type: 'array',
                                        items: configStrategy.ConfigStrategyCriteriaResponse
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    '/criteria/snapshot_check/{version}': {
        get: {
            tags: ['Client API'],
            description: 'Check if snapshot version is up to date',
            security: [{ componentAuth: [] }],
            parameters: [
                pathParameter('version', 'Snapshot version', true)
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
            security: [{ componentAuth: [] }],
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








