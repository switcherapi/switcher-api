import express from 'express';
import { graphqlHTTP } from 'express-graphql';
import cors from 'cors';
import helmet from 'helmet';    

require('./db/mongoose');

import mongoose from 'mongoose';
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
import schema from './client/schema';
import { appAuth, auth } from './middleware/auth';

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

/**
 * Client API - GraphQL
 */
app.use('/graphql', appAuth, graphqlHTTP({
    schema,
    graphiql: true
}));

/**
 * Client API - GraphQL
 */
app.use('/adm-graphql', auth, graphqlHTTP({
    schema,
    graphiql: true
}));

app.get('/check', (req, res) => {
    res.status(200).send({ 
        message: 'All good',
        code: 200,
        attributes: {
            env: process.env.ENV,
            db_state: mongoose.connection.readyState,
            switcherapi: process.env.SWITCHER_API_ENABLE,
            history: process.env.HISTORY_ACTIVATED,
            metrics: process.env.METRICS_ACTIVATED,
            max_metrics_pages: process.env.METRICS_MAX_PAGE,
            max_stretegy_op: process.env.MAX_EXIST_STRATEGYOPERATION
        } 
    });
});

app.get('*', (req, res) => {
    res.status(404).send({ error: 'Operation not found' });
});

export default app;