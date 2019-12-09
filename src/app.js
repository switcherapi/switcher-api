import express from 'express';
import expressGraphQL from 'express-graphql';

require('./db/mongoose')

import clientApiRouter from './routers/client-api';
import adminRouter from './routers/admin';
import environment from './routers/environment';
import component from './routers/component';
import domainRouter from './routers/domain';
import groupConfigRouter from './routers/group-config';
import configRouter from './routers/config';
import configStrategyRouter from './routers/config-strategy';
import schema from './client/query-schema';
import { appAuth } from './middleware/auth';

const app = express()

app.use(express.json())

/**
 * API Routers
 */
app.use(clientApiRouter)
app.use(adminRouter)
app.use(component)
app.use(environment)
app.use(domainRouter)
app.use(groupConfigRouter)
app.use(configRouter)
app.use(configStrategyRouter)

/**
 * Client API - GraphQL
 */
app.use('/graphql', appAuth, expressGraphQL({
    schema,
    graphiql: true
}))

export default app;