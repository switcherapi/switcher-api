import { ActionTypes, RouterTypes } from '../../models/permission.js';
import { pathParameter, queryParameter } from '../schemas/common.js';
import { commonArraySchemaContent, commonSchemaContent } from './common.js';

export default {
    '/permission/create/{team}': {
        post: {
            tags: ['Permission'],
            description: 'Create a new permission',
            security: [{ bearerAuth: [] }],
            parameters: [
                pathParameter('team', 'Team ID', true)
            ],
            requestBody: {
                content: commonSchemaContent('Permission')
            },
            responses: {
                201: {
                    description: 'Permission created',
                    content: commonSchemaContent('Permission')
                }
            }
        }
    },
    '/permission/routers': {
        get: {
            tags: ['Permission'],
            description: 'Get all routers available',
            security: [{ bearerAuth: [] }],
            responses: {
                200: {
                    description: 'Routers available',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    routersAvailable: {
                                        type: 'array',
                                        items: {
                                            type: 'string',
                                            enum: Object.values(RouterTypes)
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
    '/permission/spec/router/{router}': {
        get: {
            tags: ['Permission'],
            description: 'Get key available for a router',
            security: [{ bearerAuth: [] }],
            parameters: [
                pathParameter('router', 'Router Name', true)
            ],
            responses: {
                200: {
                    description: 'Key available',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    key: {
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
    '/permission/actions': {
        get: {
            tags: ['Permission'],
            description: 'Get all actions available',
            security: [{ bearerAuth: [] }],
            responses: {
                200: {
                    description: 'Actions available',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    actionsAvailable: {
                                        type: 'array',
                                        items: {
                                            type: 'string',
                                            enum: Object.values(ActionTypes)
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
    '/permission': {
        get: {
            tags: ['Permission'],
            description: 'Get all permissions',
            security: [{ bearerAuth: [] }],
            parameters: [
                queryParameter('team', 'Team ID', true, 'string')
            ],
            responses: {
                200: {
                    description: 'Permissions',
                    content: commonArraySchemaContent('Permission')
                }
            }
        }
    },
    '/permission/{id}': {
        get: {
            tags: ['Permission'],
            description: 'Get a permission',
            security: [{ bearerAuth: [] }],
            parameters: [
                pathParameter('id', 'Permission ID', true)
            ],
            responses: {
                200: {
                    description: 'Permission',
                    content: commonSchemaContent('Permission')
                }
            }
        },
        patch: {
            tags: ['Permission'],
            description: 'Update a permission',
            security: [{ bearerAuth: [] }],
            parameters: [
                pathParameter('id', 'Permission ID', true)
            ],
            requestBody: {
                content: commonSchemaContent('PermissionUpdateRequest')
            },
            responses: {
                200: {
                    description: 'Permission updated',
                    content: commonSchemaContent('Permission')
                }
            }
        },
        delete: {
            tags: ['Permission'],
            description: 'Delete a permission',
            security: [{ bearerAuth: [] }],
            parameters: [
                pathParameter('id', 'Permission ID', true)
            ],
            responses: {
                200: {
                    description: 'Permission deleted',
                    content: commonSchemaContent('Permission')
                }
            }
        }
    },
    '/permission/value/add/{id}': {
        patch: {
            tags: ['Permission'],
            description: 'Add a value to a permission',
            security: [{ bearerAuth: [] }],
            parameters: [
                pathParameter('id', 'Permission ID', true)
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
                    description: 'Permission updated',
                    content: commonSchemaContent('Permission')
                }
            }
        }
    },
    '/permission/value/remove/{id}': {
        patch: {
            tags: ['Permission'],
            description: 'Remove a value from a permission',
            security: [{ bearerAuth: [] }],
            parameters: [
                pathParameter('id', 'Permission ID', true)
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
                    description: 'Permission updated',
                    content: commonSchemaContent('Permission')
                }
            }
        }
    },
    '/permission/updateValues/{id}': {
        patch: {
            tags: ['Permission'],
            description: 'Update values of a permission',
            security: [{ bearerAuth: [] }],
            parameters: [
                pathParameter('id', 'Permission ID', true)
            ],
            requestBody: {
                content: commonSchemaContent('Permission')
            },
            responses: {
                200: {
                    description: 'Permission updated',
                    content: commonSchemaContent('Permission')
                }
            }
        }
    }
};