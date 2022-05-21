import { ActionTypes, RouterTypes } from '../../models/role';
import { pathParameter, queryParameter } from '../schemas/common';
import { commonArraySchemaContent, commonSchemaContent } from './common';

export default {
    '/role/create/:team': {
        post: {
            tags: ['Role'],
            description: 'Create a new role',
            security: [{ bearerAuth: [] }],
            parameters: [
                pathParameter('team', 'Team ID', 'string', true)
            ],
            requestBody: {
                content: commonSchemaContent('Role')
            },
            responses: {
                201: {
                    description: 'Role created',
                    content: commonSchemaContent('Role')
                }
            }
        }
    },
    '/role/routers': {
        get: {
            tags: ['Role'],
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
    '/role/spec/router/:router': {
        get: {
            tags: ['Role'],
            description: 'Get key available for a router',
            security: [{ bearerAuth: [] }],
            parameters: [
                pathParameter('router', 'Router Name', 'string', true)
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
    '/role/actions': {
        get: {
            tags: ['Role'],
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
    '/role': {
        get: {
            tags: ['Role'],
            description: 'Get all roles',
            security: [{ bearerAuth: [] }],
            parameters: [
                queryParameter('team', 'Team ID', 'string', true)
            ],
            responses: {
                200: {
                    description: 'Roles',
                    content: commonArraySchemaContent('Role')
                }
            }
        }
    },
    '/role/:id': {
        get: {
            tags: ['Role'],
            description: 'Get a role',
            security: [{ bearerAuth: [] }],
            parameters: [
                pathParameter('id', 'Role ID', 'string', true)
            ],
            responses: {
                200: {
                    description: 'Role',
                    content: commonSchemaContent('Role')
                }
            }
        },
        patch: {
            tags: ['Role'],
            description: 'Update a role',
            security: [{ bearerAuth: [] }],
            parameters: [
                pathParameter('id', 'Role ID', 'string', true)
            ],
            requestBody: {
                content: commonSchemaContent('RoleUpdateRequest')
            },
            responses: {
                200: {
                    description: 'Role updated',
                    content: commonSchemaContent('Role')
                }
            }
        },
        delete: {
            tags: ['Role'],
            description: 'Delete a role',
            security: [{ bearerAuth: [] }],
            parameters: [
                pathParameter('id', 'Role ID', 'string', true)
            ],
            responses: {
                200: {
                    description: 'Role deleted',
                    content: commonSchemaContent('Role')
                }
            }
        }
    },
    '/role/value/add/:id': {
        patch: {
            tags: ['Role'],
            description: 'Add a value to a role',
            security: [{ bearerAuth: [] }],
            parameters: [
                pathParameter('id', 'Role ID', 'string', true)
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
                    description: 'Role updated',
                    content: commonSchemaContent('Role')
                }
            }
        }
    },
    '/role/value/remove/:id': {
        patch: {
            tags: ['Role'],
            description: 'Remove a value from a role',
            security: [{ bearerAuth: [] }],
            parameters: [
                pathParameter('id', 'Role ID', 'string', true)
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
                    description: 'Role updated',
                    content: commonSchemaContent('Role')
                }
            }
        }
    },
    '/role/updateValues/:id': {
        patch: {
            tags: ['Role'],
            description: 'Update values of a role',
            security: [{ bearerAuth: [] }],
            parameters: [
                pathParameter('id', 'Role ID', 'string', true)
            ],
            requestBody: {
                content: commonSchemaContent('Role')
            },
            responses: {
                200: {
                    description: 'Role updated',
                    content: commonSchemaContent('Role')
                }
            }
        }
    }
};