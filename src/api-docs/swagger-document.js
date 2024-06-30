import pathAdmin from './paths/path-admin.js';
import pathDomain from './paths/path-domain.js';
import pathGroup from './paths/path-group-config.js';
import pathConfig from './paths/path-config.js';
import pathConfigStrategy from './paths/path-config-strategy.js';
import pathEnvironment from './paths/path-environment.js';
import pathComponent from './paths/path-component.js';
import pathTeam from './paths/path-team.js';
import pathPermission from './paths/path-permission.js';
import pathMetric from './paths/path-metric.js';
import pathSlack from './paths/path-slack.js';

import { commonSchema } from './schemas/common.js';
import adminSchema from './schemas/admin.js';
import domainSchema from './schemas/domain.js';
import groupSchema from './schemas/group-config.js';
import configSchema from './schemas/config.js';
import configStrategySchema from './schemas/config-strategy.js';
import environmentSchema from './schemas/environment.js';
import componentSchema from './schemas/component.js';
import teamSchema from './schemas/team.js';
import permissionSchema from './schemas/permission.js';
import metricSchema from './schemas/metric.js';
import slackSchema from './schemas/slack.js';
import info from './swagger-info.js';

export default {
    openapi: '3.0.1',
    info,
    servers: [
        {
            url: 'http://localhost:3000',
            description: 'Local'
        },
        {
            url: 'https://switcherapi.com/api',
            description: 'Cloud API'
        }
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT'
            },
            slackAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT'
            }
        },
        schemas: {
            ...commonSchema,
            ...adminSchema,
            ...domainSchema,
            ...groupSchema,
            ...configSchema,
            ...configStrategySchema,
            ...environmentSchema,
            ...componentSchema,
            ...teamSchema,
            ...permissionSchema,
            ...metricSchema,
            ...slackSchema
        }
    },
    paths: {
        ...pathAdmin,
        ...pathDomain,
        ...pathGroup,
        ...pathConfig,
        ...pathConfigStrategy,
        ...pathEnvironment,
        ...pathComponent,
        ...pathTeam,
        ...pathPermission,
        ...pathMetric,
        ...pathSlack
    }
};