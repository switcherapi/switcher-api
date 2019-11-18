const express = require('express')
require('./db/mongoose')

const clientApiRouter = require('./routers/client-api')
const adminRouter = require('./routers/admin')
const domainRouter = require('./routers/domain')
const groupConfigRouter = require('./routers/group-config')
const configRouter = require('./routers/config')
const configStrategyRouter = require('./routers/config-strategy')

const app = express()
const port = process.env.PORT

// app.use((req, res, next) => {
//     res.status(504).send('API is under maintenance')
// })

app.use(express.json())
app.use(clientApiRouter)
app.use(adminRouter)
app.use(domainRouter)
app.use(groupConfigRouter)
app.use(configRouter)
app.use(configStrategyRouter)

app.listen(port, () => {
    console.log('Server is up on port ' + port)
})