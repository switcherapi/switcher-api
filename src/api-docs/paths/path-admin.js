import { jwt } from '../schemas/admin.js';
import { pathParameter, queryParameter } from '../schemas/common.js';
import { commonSchemaContent } from './common.js';

export default {
    '/admin/signup': {
        post: {
            tags: ['Admin'],
            description: 'Admin signup',
            requestBody: {
                content: commonSchemaContent('AdminSignupRequest')
            },
            responses: {
                '201': {
                    description: 'Admin signup',
                    content: commonSchemaContent('Admin')
                }
            }
        }
    },
    '/admin/signup/authorization': {
        post: {
            tags: ['Admin'],
            description: 'Admin signup authorization',
            parameters: [
               queryParameter('code', 'Authorization code', true)
            ],
            responses: {
                '201': {
                    description: 'Admin signup authorization',
                    content: commonSchemaContent('AdminLoginResponse')
                }
            }
        }
    },
    '/admin/github/auth': {
        post: {
            tags: ['Admin'],
            description: 'Admin signup via GitHub',
            parameters: [
                queryParameter('code', 'Authorization code', true)
            ],
            responses: {
                '201': {
                    description: 'Admin signup via GitHub',
                    content: commonSchemaContent('AdminLoginResponse')
                }
            }
        }
    },
    '/admin/bitbucket/auth': {
        post: {
            tags: ['Admin'],
            description: 'Admin signup via Bitbucket',
            parameters: [
                queryParameter('code', 'Authorization code', true)
            ],
            responses: {
                '201': {
                    description: 'Admin signup via Bitbucket',
                    content: commonSchemaContent('AdminLoginResponse')
                }
            }
        }
    },
    '/admin/login': {
        post: {
            tags: ['Admin'],
            description: 'Authenticate user using internal API credentials',
            requestBody: {
                content: commonSchemaContent('AdminLoginRequest')
            },
            responses: {
                '200': {
                    description: 'Success',
                    content: commonSchemaContent('AdminLoginResponse')
                }
            }
        }
    },
    '/admin/logout': {
        post: {
            tags: ['Admin'],
            description: 'Logout',
            security: [{ bearerAuth: [] }],
            responses: {
                '200': {
                    description: 'Success'
                }
            }
        }
    },
    '/admin/login/request/recovery': {
        post: {
            tags: ['Admin'],
            description: 'Admin password recovery request',
            requestBody: {
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                email: {
                                    type: 'string',
                                    format: 'email'
                                }
                            }
                        }
                    }
                }
            },
            responses: {
                '200': {
                    description: 'Success',
                    content: commonSchemaContent('Message')
                }
            }
        }
    },
    '/admin/login/recovery': {
        post: {
            tags: ['Admin'],
            description: 'Admin password recovery',
            requestBody: {
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                code: {
                                    type: 'string',
                                },
                                password: {
                                    type: 'string'
                                },
                                token: {
                                    type: 'string'
                                }
                            }
                        }
                    }
                }
            },
            responses: {
                '200': {
                    description: 'Success',
                    content: commonSchemaContent('AdminLoginResponse')
                }
            }
        }
    },
    '/admin/me': {
        get: {
            tags: ['Admin'],
            description: 'Get the current admin',
            security: [{ bearerAuth: [] }],
            responses: {
                '200': {
                    description: 'Success',
                    content: commonSchemaContent('Admin')
                }
            }
        },
        patch: {
            tags: ['Admin'],
            description: 'Update admin profile',
            security: [{ bearerAuth: [] }],
            requestBody: {
                content: commonSchemaContent('AdminUpdateRequest')
            },
            responses: {
                '200': {
                    description: 'Success',
                    content: commonSchemaContent('Admin')
                }
            }
        },
        delete: {
            tags: ['Admin'],
            description: 'Delete the current admin',
            security: [{ bearerAuth: [] }],
            responses: {
                '200': {
                    description: 'Success',
                    content: commonSchemaContent('Admin')
                }
            }
        }
    },
    '/admin/collaboration': {
        get: {
            tags: ['Admin'],
            description: 'Get the current domain Ids which admin is collaborating on',
            security: [{ bearerAuth: [] }],
            responses: {
                '200': {
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
    '/admin/collaboration/permission': {
        post: {
            tags: ['Admin'],
            description: 'Read Admin collaboration permissions',
            security: [{ bearerAuth: [] }],
            requestBody: {
                content: commonSchemaContent('AdminPermissionReadRequest'),
            },
            responses: {
                '200': {
                    description: 'Success',
                    content: commonSchemaContent('AdminPermissionReadResponse')
                }
            }
        }
    },
    '/admin/{adminid}': {
        get: {
            tags: ['Admin'],
            description: 'Get single admin',
            security: [{ bearerAuth: [] }],
            parameters: [
                pathParameter('adminid', 'Admin ID', true)
            ],
            responses: {
                '200': {
                    description: 'Success',
                    content: commonSchemaContent('Admin')
                }
            }
        }
    },
    '/admin/refresh/me': {
        post: {
            tags: ['Admin'],
            description: 'Refresh token for the current admin',
            security: [{ bearerAuth: [] }],
            requestBody: {
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                token: {
                                    type: 'string'
                                },
                                refreshToken: {
                                    type: 'string'
                                }
                            }
                        }
                    }
                }
            },
            responses: {
                '200': {
                    description: 'Success',
                    content: {
                        'application/json': {
                            schema: {...jwt}
                        }
                    }
                }
            }
        }
    }
};