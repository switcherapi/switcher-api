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
    },
    '/gitops/v1/account/unsubscribe': {
        post: {
            tags: ['Switcher GitOps'],
            description: 'Unsubscribe an account from receiving gitops changes',
            requestBody: {
                content: commonSchemaContent('GitOpsAccountUnsubscribeRequest')
            },
            responses: {
                200: {
                    description: 'Account unsubscribed successfully'
                },
                500: {
                    description: 'Something went wrong while unsubscribing the account',
                    content: commonSchemaContent('ErrorResponse')
                }
            }
        }
    },
    '/gitops/v1/account': {
        put: {
            tags: ['Switcher GitOps'],
            description: 'Update an account to receive gitops changes',
            requestBody: {
                content: commonSchemaContent('GitOpsAccountUpdateRequest')
            },
            responses: {
                200: {
                    description: 'Account update successful',
                    content: commonSchemaContent('GitOpsAccountResponse')
                },
                400: {
                    description: 'Invalid request body',
                    content: commonSchemaContent('ErrorResponse')
                },
                500: {
                    description: 'Something went wrong while updating the account',
                    content: commonSchemaContent('ErrorResponse')
                }
            }
        }
    },
    '/gitops/v1/account/token': {
        put: {
            tags: ['Switcher GitOps'],
            description: 'Update an account token to receive gitops changes',
            requestBody: {
                content: commonSchemaContent('GitOpsAccountTokenUpdateRequest')
            },
            responses: {
                200: {
                    description: 'Account token update successful',
                    content: commonSchemaContent('GitOpsAccountResponse')
                },
                400: {
                    description: 'Invalid request body',
                    content: commonSchemaContent('ErrorResponse')
                },
                500: {
                    description: 'Something went wrong while updating the account token',
                    content: commonSchemaContent('ErrorResponse')
                }
            }
        }
    },
    '/gitops/v1/account/forcesync': {
        put: {
            tags: ['Switcher GitOps'],
            description: 'Force sync an account to receive gitops changes',
            requestBody: {
                content: commonSchemaContent('GitOpsAccountForceSyncRequest')
            },
            responses: {
                200: {
                    description: 'Account force sync successful',
                    content: commonSchemaContent('GitOpsAccountResponse')
                },
                400: {
                    description: 'Invalid request body',
                    content: commonSchemaContent('ErrorResponse')
                },
                500: {
                    description: 'Something went wrong while force syncing the account',
                    content: commonSchemaContent('ErrorResponse')
                }
            }
        }
    }
};