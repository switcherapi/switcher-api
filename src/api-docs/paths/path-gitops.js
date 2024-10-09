import { commonSchemaContent } from './common.js';

export default {
    '/gitops/v1/push': {
        post: {
            tags: ['Switcher GitOps'],
            description: 'Push changes to the gitops repository',
            security: [{ gitopsAuth: [] }],
            requestBody: {
                content: commonSchemaContent('GitOpsPushRequest')
            },
            responses: {
                200: {
                    description: 'Changes applied successfully',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    message: {
                                        type: 'string',
                                        example: 'Changes applied successfully'
                                    },
                                    version: {
                                        type: 'number',
                                        description: 'Domain version (lastUpdate)',
                                        example: 123456789
                                    }
                                }
                            }
                        }
                    }
                },
                500: {
                    description: 'Something went wrong while applying the changes',
                    content: {
                        'application/json': {
                            schema: {
                                type: 'object',
                                properties: {
                                    error: {
                                        type: 'string',
                                        example: 'One or more changes could not be applied'
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
    },
    '/gitops/v1/account/subscribe': {
        post: {
            tags: ['Switcher GitOps'],
            description: 'Subscribe an account to receive gitops changes',
            requestBody: {
                content: commonSchemaContent('GitOpsAccountRequest')
            },
            responses: {
                201: {
                    description: 'Account subscription successful',
                    content: commonSchemaContent('GitOpsAccountResponse')
                },
                400: {
                    description: 'Invalid request body',
                    content: commonSchemaContent('ErrorResponse')
                },
                500: {
                    description: 'Something went wrong while subscribing the account',
                    content: commonSchemaContent('ErrorResponse')
                }
            }
        }
    }
};