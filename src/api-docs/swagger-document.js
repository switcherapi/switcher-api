import pathAdmin from './paths/path-admin';
import pathDomain from './paths/path-domain';
import pathGroup from './paths/path-group-config';
import pathConfig from './paths/path-config';
import pathConfigStrategy from './paths/path-config-strategy';
import pathEnvironment from './paths/path-environment';
import pathComponent from './paths/path-component';
import pathTeam from './paths/path-team';
import pathRole from './paths/path-role';
import pathMetric from './paths/path-metric';
import pathSlack from './paths/path-slack';
import pathClient from './paths/path-client';

import { commonSchema } from './schemas/common';
import adminSchema from './schemas/admin';
import domainSchema from './schemas/domain';
import groupSchema from './schemas/group-config';
import configSchema from './schemas/config';
import configStrategySchema from './schemas/config-strategy';
import environmentSchema from './schemas/environment';
import componentSchema from './schemas/component';
import teamSchema from './schemas/team';
import roleSchema from './schemas/role';
import metricSchema from './schemas/metric';
import slackSchema from './schemas/slack';
import info from './swagger-info';

export default {
    openapi: '3.0.1',
    info,
    servers: [
        {
            url: 'http://localhost:3000',
            description: 'Local'
        },
        {
            url: 'https://switcher-api.herokuapp.com',
            description: 'Production'
        }
    ],
    consumes: ['application/json'],
    produces: ['application/json'],
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
            },
            appAuth: {
                type: 'http',
                scheme: 'bearer',
                name: 'JWT'
            },
            apiKey: {
                type: 'apiKey',
                in: 'header',
                name: 'switcher-api-key'
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
            ...roleSchema,
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
        ...pathRole,
        ...pathMetric,
        ...pathClient,
        ...pathSlack
    }
};