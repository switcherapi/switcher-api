import { pagination } from '../schemas/common';

const domainSchemaContent = {
    'application/json': {
        schema: {
            $ref: '#/components/schemas/Domain'
        }
    }
};

export default {
    '/domain': {
        get: {
            tags: ['Domain'],
            description: 'Get all domains',
            security: [{
                bearerAuth: []
            }],
            parameters: [...pagination],
            responses: {
                '200': {
                    description: 'Success',
                    content: domainSchemaContent
                }
            }
        }
    }
};