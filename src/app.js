import express from 'express';
import swaggerUi from 'swagger-ui-express';
import { createHandler } from 'graphql-http/lib/use/express';
import cors from 'cors';
import helmet from 'helmet';

import './db/mongoose.js';

import mongoose from 'mongoose';
import swaggerDocument from './api-docs/swagger-document.js';
import adminRouter from './routers/admin.js';
import environment from './routers/environment.js';
import component from './routers/component.js';
import domainRouter from './routers/domain.js';
import groupConfigRouter from './routers/group-config.js';
import configRouter from './routers/config.js';
import configStrategyRouter from './routers/config-strategy.js';
import metricRouter from './routers/metric.js';
import teamRouter from './routers/team.js';
import permissionRouter from './routers/permission.js';
import slackRouter from './routers/slack.js';
import gitOpsRouter from './routers/gitops.js';
import schema from './aggregator/schema.js';
import { auth, resourcesAuth, slackAuth, gitopsAuth } from './middleware/auth.js';
import { DEFAULT_RATE_LIMIT, defaultLimiter } from './middleware/limiter.js';
import { createServer } from './app-server.js';

const app = express();
app.use(express.json());

/**
 * Cors configuration
 */
app.use(cors());
app.use(helmet());
app.disable('x-powered-by');

/**
 * API Routes
 */
app.use(adminRouter);
app.use(component);
app.use(environment);
app.use(domainRouter);
app.use(groupConfigRouter);
app.use(configRouter);
app.use(configStrategyRouter);
app.use(metricRouter);
app.use(teamRouter);
app.use(permissionRouter);
app.use(slackRouter);
app.use(gitOpsRouter);

/**
 * GraphQL Routes
 */

const handler = (req, res, next) => 
    createHandler({ schema, context: req })(req, res, next);

// Admin: Aggregator API
app.use('/adm-graphql', auth, defaultLimiter, handler);
// Slack: Aggregator API
app.use('/slack-graphql', slackAuth, handler);
// GitOps: Aggregator API
app.use('/gitops-graphql', gitopsAuth, handler);

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

app.get('/check', defaultLimiter, (req, res) => {
    const showDetails = req.query.details === '1';
    const response = {
        status: 'UP'
    };

    if (showDetails) {
        response.attributes = {
            version: swaggerDocument.info.version,
            release_time: process.env.RELEASE_TIME,
            env: process.env.ENV,
            db_state: mongoose.connection.readyState,
            switcherapi: process.env.SWITCHER_API_ENABLE,
            switcherapi_logger: process.env.SWITCHER_API_LOGGER,
            relay_bypass_https: process.env.RELAY_BYPASS_HTTPS,
            relay_bypass_verification: process.env.RELAY_BYPASS_VERIFICATION,
            permission_cache: process.env.PERMISSION_CACHE_ACTIVATED,
            history: process.env.HISTORY_ACTIVATED,
            max_metrics_pages: process.env.METRICS_MAX_PAGE,
            max_stretegy_op: process.env.MAX_STRATEGY_OPERATION,
            max_rpm: process.env.MAX_REQUEST_PER_MINUTE || DEFAULT_RATE_LIMIT
        };
    }

    res.status(200).send(response);
});

export default createServer(app);