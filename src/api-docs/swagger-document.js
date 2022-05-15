import pathAdmin from './paths/path-admin';
import pathDomain from './paths/path-domain';
import pathConfig from './paths/path-config';
import { commonSchema } from './schemas/common';
import adminSchema from './schemas/admin';
import domainSchema from './schemas/domain';
import configSchema from './schemas/config';
import componentSchema from './schemas/component';
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
    tags: [
        {
            name: 'Admin',
        },
        {
            name: 'Domain',
        },
        {
            name: 'Config',
        }
    ],
    components: {
        securitySchemes: {
            bearerAuth: {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT'
            }
        },
        schemas: {
            ...commonSchema,
            ...adminSchema,
            ...domainSchema,
            ...configSchema,
            ...componentSchema
        }
    },
    paths: {
        ...pathAdmin,
        ...pathDomain,
        ...pathConfig
    }
};