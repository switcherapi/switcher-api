import pathAdmin from './paths/path-admin';
import pathDomain from './paths/path-domain';
import { commonSchema } from './schemas/common';
import adminSchema from './schemas/admin';
import domainSchema from './schemas/domain';
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
            ...domainSchema
        }
    },
    paths: {
        ...pathAdmin,
        ...pathDomain
    }
};