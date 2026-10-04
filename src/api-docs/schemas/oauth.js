import { config } from './config.js';

const oauthMetadata = {
    type: 'object',
    properties: {
        issuer: {
            type: 'string'
        },
        authorization_endpoint: {
            type: 'string'
        },
        token_endpoint: {
            type: 'string'
        },
        registration_endpoint: {
            type: 'string'
        },
        scopes_supported: {
            type: 'array',
            items: {
                type: 'string'
            }
        },
        response_types_supported: {
            type: 'array',
            items: {
                type: 'string'
            }
        },
        grant_types_supported: {
            type: 'array',
            items: {
                type: 'string'
            }
        },
        code_challenge_methods_supported: {
            type: 'array',
            items: {
                type: 'string'
            }
        },
        token_endpoint_auth_methods_supported: {
            type: 'array',
            items: {
                type: 'string'
            }
        }
    }
};

export default {
    OAuthClientRegistrationRequest: {
        type: 'object',
        required: ['redirect_uris'],
        properties: {
            client_name: {
                type: 'string'
            },
            redirect_uris: {
                type: 'array',
                items: {
                    type: 'string'
                }
            },
            grant_types: {
                type: 'array',
                items: {
                    type: 'string'
                }
            },
            response_types: {
                type: 'array',
                items: {
                    type: 'string'
                }
            },
            token_endpoint_auth_method: {
                type: 'string'
            },
            scope: {
                type: 'string'
            }
        }
    },
    OAuthClientRegistrationResponse: {
        type: 'object',
        properties: {
            client_id: {
                type: 'string'
            },
            client_id_issued_at: {
                type: 'integer'
            },
            client_name: {
                type: 'string'
            },
            redirect_uris: {
                type: 'array',
                items: {
                    type: 'string'
                }
            },
            grant_types: {
                type: 'array',
                items: {
                    type: 'string'
                }
            },
            response_types: {
                type: 'array',
                items: {
                    type: 'string'
                }
            },
            token_endpoint_auth_method: {
                type: 'string'
            },
            scope: {
                type: 'string'
            }
        }
    },
    OAuthTokenRequest: {
        type: 'object',
        properties: {
            grant_type: {
                type: 'string'
            },
            code: {
                type: 'string'
            },
            redirect_uri: {
                type: 'string'
            },
            client_id: {
                type: 'string'
            },
            code_verifier: {
                type: 'string'
            },
            refresh_token: {
                type: 'string'
            }
        }
    },
    OAuthTokenResponse: {
        type: 'object',
        properties: {
            access_token: {
                type: 'string'
            },
            token_type: {
                type: 'string'
            },
            expires_in: {
                type: 'integer'
            },
            refresh_token: {
                type: 'string'
            },
            scope: {
                type: 'string'
            }
        }
    },
    OAuthAuthorizationServerMetadata: oauthMetadata,
    OAuthProtectedResourceMetadata: {
        ...oauthMetadata,
        properties: {
            resource: {
                type: 'string'
            },
            authorization_servers: {
                type: 'array',
                items: {
                    type: 'string'
                }
            },
            bearer_methods_supported: {
                type: 'array',
                items: {
                    type: 'string'
                }
            },
            ...oauthMetadata.properties
        }
    },
    ConfigByKeyResponse: {
        ...config({
            type: 'array',
            description: 'The component IDs that can use the Swichter',
            items: {
                type: 'string'
            }
        }),
        properties: {
            ...config({
                type: 'array',
                description: 'The component IDs that can use the Swichter',
                items: {
                    type: 'string'
                }
            }).properties,
            enabled: {
                type: 'boolean'
            }
        }
    }
};
