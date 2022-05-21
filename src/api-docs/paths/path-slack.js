import { pathParameter, queryParameter } from '../schemas/common';
import { commonSchemaContent } from './common';

export default {
    '/slack/v1/availability': {
        post: {
            tags: ['Switcher Slack App'],
            description: 'Check if the feature is available',
            security: [{ bearerAuth: [] }],
            requestBody: {
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                feature: {
                                    type: 'string',
                                    description: 'The feature to check'
                                }
                            }
                        }
                    }
                }
            },
            responses: {
                200: {
                    description: 'The feature is available',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    result: {
                                        type: 'boolean',
                                        description: 'The feature is available'
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    '/slack/v1/installation': {
        post: {
            tags: ['Slack App'],
            description: 'Create a new slack installation',
            security: [{ slackAuth: [] }],
            requestBody: {
                content: commonSchemaContent('SlackInstallationRequest')
            },
            responses: {
                201: {
                    description: 'The slack installation was created',
                    content: commonSchemaContent('Slack')
                }
            }
        },
        delete: {
            tags: ['Slack App'],
            description: 'Delete a slack installation',
            security: [{ slackAuth: [] }],
            parameters: [
                queryParameter('team_id', 'The team id', 'string', true)
            ],
            responses: {
                200: {
                    description: 'The slack installation was deleted',
                    content: commonSchemaContent('Slack')
                }
            }
        }
    },
    '/slack/v1/authorize': {
        post: {
            tags: ['Switcher Slack App'],
            description: 'Authorize a slack installation',
            security: [{ bearerAuth: [] }],
            requestBody: {
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                domain: {
                                    type: 'string',
                                    description: 'The domain ID',
                                    format: 'uuid'
                                },
                                team_id: {
                                    type: 'string',
                                    description: 'The Slack team ID'
                                }
                            }
                        }
                    }
                }
            },
            responses: {
                200: {
                    description: 'The slack installation was authorized',
                    content: commonSchemaContent('Message')
                }
            }
        }
    },
    '/slack/v1/ticket/clear': {
        post: {
            tags: ['Switcher Slack App'],
            description: 'Clear the ticket history',
            security: [{ bearerAuth: [] }],
            requestBody: {
                content: {
                    'application/json': {
                        schema: {
                            type: 'object',
                            properties: {
                                team_id: {
                                    type: 'string',
                                    description: 'The Slack team ID',
                                }
                            }
                        }
                    }
                }
            },
            responses: {
                200: {
                    description: 'The ticket history was cleared',
                    content: commonSchemaContent('Message')
                }
            }
        }
    },
    '/slack/v1/ticket/validate': {
        post: {
            tags: ['Slack App'],
            description: 'Validate the ticket',
            security: [{ slackAuth: [] }],
            requestBody: {
                content: commonSchemaContent('SlackTicketRequest')
            },
            responses: {
                200: {
                    description: 'The ticket was validated',
                    content: commonSchemaContent('Message')
                }
            }
        }
    },
    '/slack/v1/ticket/create': {
        post: {
            tags: ['Slack App'],
            description: 'Create a new ticket',
            security: [{ slackAuth: [] }],
            requestBody: {
                content: commonSchemaContent('SlackTicketRequest')
            },
            responses: {
                200: {
                    description: 'The ticket was created',
                    content: commonSchemaContent('SlackTicket')
                }
            }
        }
    },
    '/slack/v1/ticket/process': {
        post: {
            tags: ['Slack App'],
            description: 'Process a ticket',
            security: [{ slackAuth: [] }],
            requestBody: {
                content: commonSchemaContent('SlackTicketProcessRequest')
            },
            responses: {
                200: {
                    description: 'The ticket was processed',
                    content: commonSchemaContent('Message')
                }
            }
        }
    },
    '/slack/v1/findbot': {
        get: {
            tags: ['Slack App'],
            description: 'Find the bot',
            security: [{ slackAuth: [] }],
            parameters: [
                queryParameter('team_id', 'The Slack team ID', 'string', true)
            ],
            responses: {
                200: {
                    description: 'The bot was found',
                    content: commonSchemaContent('SlackBot')
                }
            }
        }
    },
    '/slack/v1/findinstallation': {
        get: {
            tags: ['Slack App'],
            description: 'Find the installation without checking the domain',
            security: [{ slackAuth: [] }],
            parameters: [
                queryParameter('team_id', 'The Slack team ID', 'string', true)
            ],
            responses: {
                200: {
                    description: 'The installation was found',
                    content: commonSchemaContent('SlackInstallation')
                }
            }
        }
    },
    '/slack/v1/installation/find': {
        get: {
            tags: ['Switcher Slack App'],
            description: 'Find the installation',
            security: [{ bearerAuth: [] }],
            parameters: [
                queryParameter('team_id', 'The Slack team ID', 'string', true)
            ],
            responses: {
                200: {
                    description: 'The installation was found',
                    content: commonSchemaContent('SlackInstallation')
                }
            }
        }
    },
    '/slack/v1/installation/:domain': {
        get: {
            tags: ['Switcher Slack App'],
            description: 'Return complete installation and settings given a domain ID',
            security: [{ bearerAuth: [] }],
            parameters: [
                pathParameter('domain', 'The domain ID', 'string', true)
            ],
            responses: {
                200: {
                    description: 'The installation was found',
                    content: commonSchemaContent('SlackInstallationSummary')
                }
            }
        }
    },
    '/slack/v1/installation/decline': {
        delete: {
            tags: ['Switcher Slack App'],
            description: 'Decline the installation',
            security: [{ bearerAuth: [] }],
            parameters: [
                queryParameter('team_id', 'The Slack team ID', 'string', true)
            ],
            responses: {
                200: {
                    description: 'The installation was declined',
                    content: commonSchemaContent('SlackInstallation')
                }
            }
        }
    },
    '/slack/v1/installation/unlink': {
        delete: {
            tags: ['Switcher Slack App'],
            description: 'Unlink the installation',
            security: [{ bearerAuth: [] }],
            parameters: [
                queryParameter('domain', 'Domain ID', 'string', true)
            ],
            responses: {
                200: {
                    description: 'The installation was unlinked',
                    content: commonSchemaContent('Message')
                }
            }
        }
    }
};