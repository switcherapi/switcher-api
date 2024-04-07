import { queryParameter } from '../schemas/common.js';
import { commonSchemaContent } from './common.js';

export default {
    '/metric/data': {
        get: {
            tags: ['Metric'],
            description: 'Get metrics data',
            security: [{ bearerAuth: [] }],
            parameters: [
                queryParameter('domainid', 'The domain id', true, 'string'),
                queryParameter('page', 'The page number', true, 'integer'),
                queryParameter('key', 'Switcher Key', false, 'string'),
                queryParameter('group', 'Group name', false, 'string'),
                queryParameter('component', 'Component name', false, 'string'),
                queryParameter('result', 'Result', false, 'boolean'),
                queryParameter('environment', 'Environment', false, 'string'),
                queryParameter('dateGroupPattern', 'Date group pattern', false, 'string'),
                queryParameter('dateAfter', 'Date after', false, 'string'),
                queryParameter('dateBefore', 'Date before', false, 'string'),
                queryParameter('sortBy', 'Sort by | Can add params separated by ;', false, 'string')
            ],
            responses: {
                200: {
                    description: 'Metrics data',
                    content: commonSchemaContent('MetricsData')
                }
            }
        }
    },
    '/metric/statistics': {
        get: {
            tags: ['Metric'],
            description: 'Get metrics statistics',
            security: [{ bearerAuth: [] }],
            parameters: [
                queryParameter('domainid', 'The domain id', true, 'string'),
                queryParameter('statistics', '[switchers, components, reasons, all]', true, 'string'),
                queryParameter('key', 'Switcher Key', false, 'string'),
                queryParameter('group', 'Group name', false, 'string'),
                queryParameter('component', 'Component name', false, 'string'),
                queryParameter('result', 'Result', false, 'boolean'),
                queryParameter('environment', 'Environment', false, 'string'),
                queryParameter('dateGroupPattern', 'Date group pattern', false, 'string'),
                queryParameter('dateAfter', 'Date after', false, 'string'),
                queryParameter('dateBefore', 'Date before', false, 'string'),
                queryParameter('sortBy', 'Sort by | Can add params separated by ;', false, 'string')
            ],
            responses: {
                200: {
                    description: 'Metrics data',
                    content: commonSchemaContent('MetricsStatisticsData')
                }
            }
        }
    },
    '/metric': {
        delete: {
            tags: ['Metric'],
            description: 'Delete metrics',
            security: [{ bearerAuth: [] }],
            parameters: [
                queryParameter('domainid', 'The domain id', true, 'string'),
                queryParameter('key', 'Switcher Key', true, 'string')
            ],
            responses: {
                200: {
                    description: 'Metrics deleted',
                    content: commonSchemaContent('Message')
                }
            }
        }
    }
};