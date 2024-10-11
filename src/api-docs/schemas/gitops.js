const change = {
    action: {
        type: 'string',
        description: 'The type of action',
        enum: ['NEW', 'CHANGED', 'DELETED']
    },
    diff: {
        type: 'string',
        description: 'The type of diff',
        enum: ['GROUP', 'CONFIG', 'STRATEGY', 'COMPONENT']
    },
    path: {
        type: 'array',
        items: {
            type: 'string'
        }
    },
    content: {
        type: 'object',
        description: 'The content of the change (COMPONENT is an array of strings)'
    }
};

const domain = {
    id: {
        type: 'string',
        description: 'The domain ID'
    },
    name: {
        type: 'string',
        description: 'The domain name'
    }
};

const settings = {
    active: {
        type: 'boolean',
        description: 'Sync handler status'
    },
    window: {
        type: 'string',
        description: 'Sync window time (s, m, h)'
    },
    forceprune: {
        type: 'boolean',
        description: 'Force delete elements from the API when true'
    }
};

const accountRequest = {
    token: {
        type: 'string',
        description: 'The Git token'
    },
    repository: {
        type: 'string',
        description: 'The repository URL'
    },
    branch: {
        type: 'string',
        description: 'The branch name'
    },
    environment: {
        type: 'string',
        description: 'The environment name'
    },
    domain: {
        type: 'object',
        properties: domain
    },
    settings: {
        type: 'object',
        properties: settings
    }
};

const accountUpdateRequest = {
    repository: {
        type: 'string',
        description: 'The repository URL'
    },
    branch: {
        type: 'string',
        description: 'The branch name'
    },
    environment: {
        type: 'string',
        description: 'The environment name'
    },
    domain: {
        type: 'object',
        properties: domain
    },
    settings: {
        type: 'object',
        properties: settings
    }
};

const accountResponse = {
    _id: {
        type: 'string',
        description: 'The account ID'
    },
    token: {
        type: 'string',
        description: 'The Git encrypted token (opaque)',
        example: '...a24f'
    },
    repository: {
        type: 'string',
        description: 'The repository URL'
    },
    branch: {
        type: 'string',
        description: 'The branch name'
    },
    environment: {
        type: 'string',
        description: 'The environment name'
    },
    domain: {
        type: 'object',
        properties: { ...domain,
            version: {
                type: 'number',
                description: 'Domain version (lastUpdate)',
                example: 123456789
            },
            lastcommit: {
                type: 'string',
                description: 'Last respository commit hash'
            },
            lastupdate: {
                type: 'string',
                description: 'Last respository commit date'
            },
            status: {
                type: 'string',
                description: 'Sync status',
                enum: ['Pending', 'Synced', 'OutSync', 'Error']
            },
            message: {
                type: 'string',
                description: 'Sync last message'
            }
        }
    },
    settings: {
        type: 'object',
        properties: settings
    }
};

export default {
    GitOpsPushRequest: {
        type: 'object',
        properties: {
            environment: {
                type: 'string',
                description: 'The environment where the change will be applied'
            },
            changes: {
                type: 'array',
                items: {
                    type: 'object',
                    properties: change
                }
            }
        }
    },
    GitOpsAccountRequest: {
        type: 'object',
        properties: accountRequest
    },
    GitOpsAccountUpdateRequest: {
        type: 'object',
        properties: accountUpdateRequest
    },
    GitOpsAccountTokenUpdateRequest: {
        type: 'object',
        properties: {
            token: {
                type: 'string',
                description: 'The Git token'
            },
            environment: {
                type: 'string',
                description: 'The environment name'
            },
            domain: {
                type: 'object',
                properties: domain
            }
        }
    },
    GitOpsAccountForceSyncRequest: {
        type: 'object',
        properties: {
            environment: {
                type: 'string',
                description: 'The environment name'
            },
            domain: {
                type: 'object',
                properties: domain
            }
        }
    },
    GitOpsAccountResponse: {
        type: 'object',
        properties: accountResponse
    },
    ErrorResponse: {
        type: 'object',
        properties: {
            error: {
                type: 'string',
                description: 'The error message'
            }
        }
    }
};