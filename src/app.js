import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { graphqlHTTP } from 'express-graphql';
import cors from 'cors';
import helmet from 'helmet';    

require('./db/mongoose');

import mongoose from 'mongoose';
import swaggerDocument from './api-docs/swagger-document';
import clientApiRouter from './routers/client-api';
import adminRouter from './routers/admin';
import environment from './routers/environment';
import component from './routers/component';
import domainRouter from './routers/domain';
import groupConfigRouter from './routers/group-config';
import configRouter from './routers/config';
import configStrategyRouter from './routers/config-strategy';
import metricRouter from './routers/metric';
import teamRouter from './routers/team';
import roleRouter from './routers/role';
import slackRouter from './routers/slack';
import schema from './client/schema';
import { appAuth, auth, resourcesAuth, slackAuth } from './middleware/auth';

const app = express();
app.use(express.json());

/**
 * Cors configuration
 */
app.use(cors());
app.use(helmet());
app.disable('x-powered-by');

/**
 * API Routers
 */
app.use(clientApiRouter);
app.use(adminRouter);
app.use(component);
app.use(environment);
app.use(domainRouter);
app.use(groupConfigRouter);
app.use(configRouter);
app.use(configStrategyRouter);
app.use(metricRouter);
app.use(teamRouter);
app.use(roleRouter);
app.use(slackRouter);

/**
 * Component: Client API - GraphQL
 */
app.use('/graphql', appAuth, graphqlHTTP({
    schema,
    graphiql: true
}));

/**
 * Admin: Client API - GraphQL
 */
app.use('/adm-graphql', auth, graphqlHTTP({
    schema,
    graphiql: true
}));

/**
 * Slack: Client API - GraphQL
 */
 app.use('/slack-graphql', slackAuth, graphqlHTTP({
    schema,
    graphiql: true
}));

/**
 * API Docs and Health Check
 */

app.use('/api-docs', resourcesAuth(),
    swaggerUi.serve, 
    swaggerUi.setup(swaggerDocument)
);

app.get('/swagger.json', resourcesAuth(), (_req, res) => {
    res.status(200).send(swaggerDocument);
});

app.get('/check', (_req, res) => {
    res.status(200).send({ 
        status: 'UP',
        attributes: {
            version: swaggerDocument.info.version,
            env: process.env.ENV,
            db_state: mongoose.connection.readyState,
            switcherapi: process.env.SWITCHER_API_ENABLE,
            switcherapi_logger: process.env.SWITCHER_API_LOGGER,
            history: process.env.HISTORY_ACTIVATED,
            metrics: process.env.METRICS_ACTIVATED,
            max_metrics_pages: process.env.METRICS_MAX_PAGE,
            max_stretegy_op: process.env.MAX_EXIST_STRATEGYOPERATION,
        } 
    });
});

app.get('*', (_req, res) => {
    res.status(404).send({ error: 'Operation not found' });
});

export default app;