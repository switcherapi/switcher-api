import { pathParameter, queryParameter } from '../schemas/common.js';
import { commonSchemaContent } from './common.js';

export default {
    '/oauth/register': {
        post: {
            tags: ['OAuth'],
            description: 'Register a public OAuth client using dynamic client registration',
            requestBody: {
                content: commonSchemaContent('OAuthClientRegistrationRequest')
            },
            responses: {
                201: {
                    description: 'OAuth client registered',
                    content: commonSchemaContent('OAuthClientRegistrationResponse')
                }
            }
        }
    },
    '/oauth/authorize': {
        get: {
            tags: ['OAuth'],
            description: 'Create an authorization code for a logged-in admin',
            security: [{ bearerAuth: [] }],
            parameters: [
                queryParameter('response_type', 'OAuth response type', true),
                queryParameter('client_id', 'OAuth client id', true),
                queryParameter('redirect_uri', 'Registered redirect uri', true),
                queryParameter('scope', 'Requested OAuth scope', false),
                queryParameter('state', 'Client-provided state', false),
                queryParameter('code_challenge', 'PKCE SHA-256 code challenge', true),
                queryParameter('code_challenge_method', 'PKCE code challenge method', true),
                queryParameter('consent', 'Consent flag', false, 'boolean')
            ],
            responses: {
                302: {
                    description: 'Redirect back to the client with authorization result'
                }
            }
        }
    },
    '/oauth/token': {
        post: {
            tags: ['OAuth'],
            description: 'Exchange an authorization code or refresh token for an access token',
            requestBody: {
                content: commonSchemaContent('OAuthTokenRequest')
            },
            responses: {
                200: {
                    description: 'OAuth token response',
                    content: commonSchemaContent('OAuthTokenResponse')
                }
            }
        }
    },
    '/.well-known/oauth-authorization-server': {
        get: {
            tags: ['OAuth'],
            description: 'OAuth authorization server metadata',
            responses: {
                200: {
                    description: 'Authorization server metadata',
                    content: commonSchemaContent('OAuthAuthorizationServerMetadata')
                }
            }
        }
    },
    '/.well-known/oauth-protected-resource': {
        get: {
            tags: ['OAuth'],
            description: 'OAuth protected resource metadata',
            responses: {
                200: {
                    description: 'Protected resource metadata',
                    content: commonSchemaContent('OAuthProtectedResourceMetadata')
                }
            }
        }
    },
    '/config/key/{key}': {
        get: {
            tags: ['Config'],
            description: 'Get Config by key and domain name',
            security: [{ bearerAuth: [] }],
            parameters: [
                pathParameter('key', 'Config key', true),
                queryParameter('domain', 'Domain name', true),
                queryParameter('environment', 'Environment name', false)
            ],
            responses: {
                200: {
                    description: 'Config',
                    content: commonSchemaContent('ConfigByKeyResponse')
                }
            }
        }
    }
};
