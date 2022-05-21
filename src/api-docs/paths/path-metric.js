import { queryParameter } from '../schemas/common';
import { commonSchemaContent } from './common';

export default {
    '/metric/data/': {
        get: {
            tags: ['Metric'],
            description: 'Get metrics data',
            security: [{ bearerAuth: [] }],
            parameters: [
                queryParameter('domainid', 'The domain id', 'string', true),
                queryParameter('page', 'The page number', 'integer', true),
                queryParameter('key', 'Switcher Key', 'string', false),
                queryParameter('group', 'Group name', 'string', false),
                queryParameter('component', 'Component name', 'string', false),
                queryParameter('result', 'Result', 'boolean', false),
                queryParameter('environment', 'Environment', 'string', false),
                queryParameter('dateGroupPattern', 'Date group pattern', 'string', false),
                queryParameter('dateAfter', 'Date after', 'string', false),
                queryParameter('dateBefore', 'Date before', 'string', false),
                queryParameter('sortBy', 'Sort by | Can add params separated by ;', 'string', false)
            ],
            responses: {
                200: {
                    description: 'Metrics data',
                    content: commonSchemaContent('MetricsData')
                }
            }
        }
    },
    '/metric/statistics/': {
        get: {
            tags: ['Metric'],
            description: 'Get metrics statistics',
            security: [{ bearerAuth: [] }],
            parameters: [
                queryParameter('domainid', 'The domain id', 'string', true),
                queryParameter('statistics', '[switchers, components, reasons, all]', 'string', true),
                queryParameter('key', 'Switcher Key', 'string', false),
                queryParameter('group', 'Group name', 'string', false),
                queryParameter('component', 'Component name', 'string', false),
                queryParameter('result', 'Result', 'boolean', false),
                queryParameter('environment', 'Environment', 'string', false),
                queryParameter('dateGroupPattern', 'Date group pattern', 'string', false),
                queryParameter('dateAfter', 'Date after', 'string', false),
                queryParameter('dateBefore', 'Date before', 'string', false),
                queryParameter('sortBy', 'Sort by | Can add params separated by ;', 'string', false)
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
                queryParameter('domainid', 'The domain id', 'string', true),
                queryParameter('key', 'Switcher Key', 'string', true)
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