const express = require('express')
const graphqlHTTP = require('express-graphql')
require('./db/mongoose')

const clientApiRouter = require('./routers/client-api')
const adminRouter = require('./routers/admin')
const domainRouter = require('./routers/domain')
const groupConfigRouter = require('./routers/group-config')
const configRouter = require('./routers/config')
const configStrategyRouter = require('./routers/config-strategy')
const clientSchema = require('./client/client-schema')
const { appAuth } = require('./middleware/auth')

const app = express()

app.use(express.json())

/**
 * API Routers
 */
app.use(clientApiRouter)
app.use(adminRouter)
app.use(domainRouter)
app.use(groupConfigRouter)
app.use(configRouter)
app.use(configStrategyRouter)

/**
 * Client API - GraphQL
 */
app.use('/switcher', appAuth, graphqlHTTP({
    schema: clientSchema,
    graphiql: true
}))

module.exports = app