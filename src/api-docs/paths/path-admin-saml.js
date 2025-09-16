import { commonSchemaContent } from './common.js';

export default {
    '/admin/saml/login': {
        get: {
            tags: ['Admin SSO'],
            description: 'Initiate SAML SSO login',
            responses: {
                '302': {
                    description: 'Redirect to SAML Identity Provider'
                },
                '404': {
                    description: 'SAML not configured'
                }
            }
        }
    },
    '/admin/saml/callback': {
        post: {
            tags: ['Admin SSO'],
            description: 'SAML callback endpoint',
            requestBody: {
                content: {
                    'application/x-www-form-urlencoded': {
                        schema: {
                            type: 'object',
                            properties: {
                                SAMLResponse: {
                                    type: 'string',
                                    description: 'SAML response from Identity Provider'
                                }
                            }
                        }
                    }
                }
            },
            responses: {
                '302': {
                    description: 'Redirect to web app with token in URL fragment'
                },
                '401': {
                    description: 'SAML authentication failed'
                },
                '404': {
                    description: 'SAML not configured'
                }
            }
        }
    },
    '/admin/saml/auth': {
        post: {
            tags: ['Admin SSO'],
            description: 'Authenticate or register SAML user',
            security: [{
                bearerAuth: []
            }],
            responses: {
                '200': {
                    description: 'Success',
                    content: commonSchemaContent('AdminLoginResponse')
                },
                '401': {
                    description: 'Authentication failed'
                },
                '404': {
                    description: 'SAML not configured'
                }
            }
        }
    },
    '/admin/saml/metadata': {
        get: {
            tags: ['Admin SSO'],
            description: 'Retrieve SAML metadata',
            responses: {
                '200': {
                    description: 'Success',
                    content: {
                        'application/xml': {
                            schema: {
                                type: 'string',
                                description: 'SAML metadata XML'
                            }
                        }
                    }
                },
                '404': {
                    description: 'SAML not configured'
                }
            }
        }
    }
};