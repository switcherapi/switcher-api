import { pagination, pathParameter, queryParameter } from '../schemas/common';
import { commonArraySchemaContent, commonSchemaContent } from './common';

export default {
    '/team/create': {
        post: {
            tags: ['Team'],
            description: 'Create team',
            security: [{ bearerAuth: [] }],
            requestBody: {
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                name: {
                                    type: 'string'
                                },
                                domain: {
                                    type: 'string'
                                }
                            }
                        }
                    }
                }
            },
            responses: {
                '201': {
                    description: 'Success',
                    content: commonSchemaContent('Team')
                }
            }
        }
    },
    '/team': {
        get: {
            tags: ['Team'],
            description: 'Get all teams',
            security: [{ bearerAuth: [] }],
            parameters: [
                queryParameter('domain', 'string', 'Domain ID', true),
                ...pagination
            ],
            responses: {
                '200': {
                    description: 'Success',
                    content: commonArraySchemaContent('Team')
                }
            }
        }
    },
    '/team/:id': {
        get: {
            tags: ['Team'],
            description: 'Get single team',
            security: [{ bearerAuth: [] }],
            parameters: [
                pathParameter('id', 'Team ID', true)
            ],
            responses: {
                '200': {
                    description: 'Success',
                    content: commonSchemaContent('Team')
                }
            }
        },
        patch: {
            tags: ['Team'],
            description: 'Update team',
            security: [{ bearerAuth: [] }],
            parameters: [
                pathParameter('id', 'Team ID', true)
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
                                active: {
                                    type: 'boolean'
                                }
                            }
                        }
                    }
                }
            },
            responses: {
                '200': {
                    description: 'Success',
                    content: commonSchemaContent('Team')
                }
            }
        },
        delete: {
            tags: ['Team'],
            description: 'Delete team',
            security: [{ bearerAuth: [] }],
            parameters: [
                pathParameter('id', 'Team ID', true)
            ],
            responses: {
                '200': {
                    description: 'Success',
                    content: commonSchemaContent('Team')
                }
            }
        }
    },
    '/team/member/invite/:id': {
        post: {
            tags: ['Team'],
            description: 'Invite member to team',
            security: [{ bearerAuth: [] }],
            parameters: [
                pathParameter('id', 'Team ID', true)
            ],
            requestBody: {
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                email: {
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
                    content: commonSchemaContent('TeamInvite')
                }
            }
        },
        get: {
            tags: ['Team'],
            description: 'Get Team Invite by ID',
            security: [{ bearerAuth: [] }],
            parameters: [
                pathParameter('id', 'Team Invite ID', true)
            ],
            responses: {
                '200': {
                    description: 'Success',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    team: {
                                        type: 'string',
                                        description: 'Team Name'
                                    },
                                    domain: {
                                        type: 'string',
                                        description: 'Domain Name'
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    '/team/member/invite/pending/:id': {
        get: {
            tags: ['Team'],
            description: 'Get pending invites',
            security: [{ bearerAuth: [] }],
            parameters: [
                pathParameter('id', 'Team ID', true)
            ],
            responses: {
                '200': {
                    description: 'Success',
                    content: commonArraySchemaContent('TeamInvite')
                }
            }
        }
    },
    '/team/member/invite/accept/:request_id': {
        post: {
            tags: ['Team'],
            description: 'Accept invite',
            security: [{ bearerAuth: [] }],
            parameters: [
                pathParameter('request_id', 'Team Invite Request ID', true)
            ],
            responses: {
                '200': {
                    description: 'Success',
                    content: commonSchemaContent('Admin')
                }
            }
        }
    },
    '/team/member/invite/remove/:id/:request_id': {
        delete: {
            tags: ['Team'],
            description: 'Remove invite',
            security: [{ bearerAuth: [] }],
            parameters: [
                pathParameter('id', 'Team ID', true),
                pathParameter('request_id', 'Team Invite Request ID', true)
            ],
            responses: {
                '200': {
                    description: 'Success',
                    content: commonSchemaContent('TeamInvite')
                }
            }
        }
    },
    '/team/member/add/:id': {
        patch: {
            tags: ['Team'],
            description: 'Add member to team',
            security: [{ bearerAuth: [] }],
            parameters: [
                pathParameter('id', 'Team ID', true)
            ],
            requestBody: {
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                member: {
                                    type: 'string',
                                    description: 'Member ID'
                                }
                            }
                        }
                    }
                }
            },
            responses: {
                '200': {
                    description: 'Success',
                    content: commonSchemaContent('Admin')
                }
            }
        }
    },
    '/team/member/remove/:id': {
        patch: {
            tags: ['Team'],
            description: 'Remove member from team',
            security: [{ bearerAuth: [] }],
            parameters: [
                pathParameter('id', 'Team ID', true)
            ],
            requestBody: {
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                member: {
                                    type: 'string',
                                    description: 'Member ID'
                                }
                            }
                        }
                    }
                }
            },
            responses: {
                '200': {
                    description: 'Success',
                    content: commonSchemaContent('Admin')
                }
            }
        }
    },
    '/team/permission/remove/:id': {
        patch: {
            tags: ['Team'],
            description: 'Remove permission from team',
            security: [{ bearerAuth: [] }],
            parameters: [
                pathParameter('id', 'Team ID', true)
            ],
            requestBody: {
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                permission: {
                                    type: 'string',
                                    description: 'Permission ID'
                                }
                            }
                        }
                    }
                }
            },
            responses: {
                '200': {
                    description: 'Success',
                    content: commonSchemaContent('Team')
                }
            }
        }
    }
};