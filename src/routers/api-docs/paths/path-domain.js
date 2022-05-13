import { pagination } from '../schemas/common';
import { commonSchemaContent } from './common';

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
                    content: commonSchemaContent('Domain')
                }
            }
        }
    }
};