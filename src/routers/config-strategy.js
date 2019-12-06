import express from 'express';
import Config from '../models/config';
import { Environment } from '../models/environment';
import { masterPermission, checkEnvironmentStatusChange, checkEnvironmentStatusRemoval } from '../middleware/validators';
import { ConfigStrategy, strategyRequirements } from '../models/config-strategy';
import { auth } from '../middleware/auth';

const router = new express.Router()

router.post('/configstrategy/create', auth, async (req, res) => {
    try {
        const config = await Config.findById(req.body.config)

        if (!config) {
            return res.status(404).send({ error: 'Config not found' })
        }

        if (!req.body.env) {
            return res.status(400).send({ error: 'Must specify environment' })
        }

        const environment = await Environment.findOne({ name: req.body.env, domain: config.domain })

        if (!environment) {
            return res.status(400).send({ error: 'Environment does not exist' })
        }

        const configStrategy = new ConfigStrategy({
            ...req.body,
            activated: new Map().set(environment.name, true),
            domain: config.domain,
            owner: req.admin._id
        })

        await configStrategy.save()
        res.status(201).send(configStrategy)
    } catch (e) {
        res.status(400).send({ error: e.message })
    }
})

// GET /configstrategy?activated=false
// GET /configstrategy?limit=10&skip=20
// GET /configstrategy?sortBy=createdAt:desc
// GET /configstrategy?config=ID
router.get("/configstrategy", auth, async (req, res) => {
    const match = {}
    const sort = {}

    if (!req.query.config) {
        return res.status(500).send({
            error: 'Please, specify the \'config\' id'
        })
    }

    if (req.query.activated) {
        match.activated = req.query.activated === 'true'
    }

    if (req.query.sortBy) {
        const parts = req.query.sortBy.split(':')
        sort[parts[0]] = parts[1] === 'desc' ? -1 : 1
    }

    try {
        const config = await Config.findById(req.query.config)

        if (!config) {
            return res.status(404).send() 
        }

        await config.populate({
            path: 'configStrategy',
            match,
            options: {
                limit: parseInt(req.query.limit),
                skip: parseInt(req.query.skip),
                sort
            }
        }).execPopulate()
        res.send(config.configStrategy)
    } catch (e) {
        res.status(500).send()
    }
})

router.get('/configstrategy/:id', auth, async (req, res) => {
    try {
        const configStrategy = await ConfigStrategy.findOne({ _id: req.params.id })

        if (!configStrategy) {
            return res.status(404).send()
        }

        res.send(configStrategy)
    } catch (e) {
        res.status(404).send()
    }
})

router.get('/configstrategy/req/:strategy', auth, (req, res) => {
    try {
        const result = strategyRequirements(req.params.strategy, res)
        res.send(result)
    } catch (e) {
        res.status(500).send()
    }
})

router.delete('/configstrategy/:id', auth, async (req, res) => {
    try {
        const configStrategy = await ConfigStrategy.findOne({ _id: req.params.id })

        if (!configStrategy) {
            return res.status(404).send()
        }

        try {
            await configStrategy.remove()
            res.send(configStrategy)
        } catch (e) {
            res.status(500).send()
        }
    } catch (e) {
        res.status(404).send()
    }
})

router.patch('/configstrategy/:id', auth, async (req, res) => {
    const updates = Object.keys(req.body)
    const allowedUpdates = ['description', 'values']
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update))

    if (!isValidOperation) {
        return res.status(400).send({ error: 'Invalid updates' })
    }

    try {
        const configStrategy = await ConfigStrategy.findOne({ _id: req.params.id })
            
        if (!configStrategy) {
            return res.status(404).send()
        }

        try {
            updates.forEach((update) => configStrategy[update] = req.body[update])
            await configStrategy.save()
            res.send(configStrategy)
        } catch (e) {
            res.status(400).send(e)
        }
    } catch (e) {
        res.status(404).send(e)
}
})

router.patch('/configstrategy/addval/:id', auth, async (req, res) => {
    const updates = Object.keys(req.body)
    const allowedUpdates = ['value']
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update))

    if (!isValidOperation) {
        return res.status(400).send({ error: 'Invalid parameter' })
    }

    try {
        const configStrategy = await ConfigStrategy.findById(req.params.id)
        
        if (!configStrategy) {
            return res.status(404).send()
        }

        try {
            if (!req.body.value) {
                return res.status(400).send({ error: 'The attribute \'value\' must be assigned' })
            }
    
            const value = req.body.value.trim()
            const foundExistingOne = configStrategy.values.find((element) => element === value)
    
            if (foundExistingOne) {
                return res.status(400).send({ error: `Value '${value}' already exist` })
            }
    
            configStrategy.values.push(value)
            await configStrategy.save()
            res.send(configStrategy)
        } catch (e) {
            res.status(400).send(e)
        }
    } catch (e) {
        res.status(404).send(e)
    }
})

router.patch('/configstrategy/updateval/:id', auth, async (req, res) => {
    const updates = Object.keys(req.body)
    const allowedUpdates = ['oldvalue', 'newvalue']
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update))

    if (!isValidOperation) {
        return res.status(400).send({ error: 'Invalid parameter' })
    }

    try {
        const configStrategy = await ConfigStrategy.findOne({ _id: req.params.id })
            
        if (!configStrategy) {
            return res.status(404).send()
        }

        try {
            if (!req.body.oldvalue || !req.body.newvalue) {
                return res.status(400).send({ error: 'Attributes \'oldvalue\' and \'newvalue\' must be assigned' })
            }

            const oldvalue = req.body.oldvalue.trim()
            const indexOldValue = configStrategy.values.indexOf(oldvalue)

            if (indexOldValue < 0) {
                return res.status(404).send({ error: `Old value '${oldvalue}' not found` })
            }

            const newvalue = req.body.newvalue.trim()
            const indexNewValue = configStrategy.values.indexOf(newvalue)

            if (indexNewValue >= 0) {
                return res.status(400).send({ error: `Value '${newvalue}' already exist` })
            }

            configStrategy.values.splice(indexOldValue)
            configStrategy.values.push(newvalue)
            await configStrategy.save()
            res.send(configStrategy)
        } catch (e) {
            res.status(400).send(e)
        }
    } catch (e) {
        res.status(404).send(e)
    }
})

router.patch('/configstrategy/removeval/:id', auth, async (req, res) => {
    const updates = Object.keys(req.body)
    const allowedUpdates = ['value']
    const isValidOperation = updates.every((update) => allowedUpdates.includes(update))

    if (!isValidOperation) {
        return res.status(400).send({ error: 'Invalid parameter' })
    }

    try {
        const configStrategy = await ConfigStrategy.findOne({ _id: req.params.id })
            
        if (!configStrategy) {
            return res.status(404).send()
        }

        try {
            if (!req.body.value) {
                return res.status(400).send({ error: 'The attribute \'value\' must be assigned' })
            }

            const value = req.body.value.trim()
            const indexValue = configStrategy.values.indexOf(value)

            if (indexValue < 0) {
                return res.status(404).send({ error: `Value '${value}' does not exist` })
            }

            configStrategy.values.splice(indexValue)
            await configStrategy.save()
            res.send(configStrategy)
        } catch (e) {
            res.status(400).send(e)
        }
    } catch (e) {
        res.status(400).send(e)
    }
})

// GET /configstrategy/values:id?sort=true
// GET /configstrategy/values:id?limit=10&skip=20
router.get("/configstrategy/values/:id", auth, async (req, res) => {
    try {
        const configStrategy = await ConfigStrategy.findOne({ _id: req.params.id })

        if (!configStrategy) {
            return res.status(404).send() 
        }
        
        try {
            let values = configStrategy.values
            if (req.query.sort === 'true') {
                values.sort()
            }

            if (req.query.limit) {
                values = values.slice(req.query.skip, req.query.limit)
            } else if (req.query.skip) {
                values = values.slice(req.query.skip, values.length)
            }

            res.send(values)
        } catch (e) {
            res.status(500).send()
        }
    } catch (e) {
        res.status(500).send()
    }
})

router.patch('/configstrategy/updateStatus/:id', auth, masterPermission('update Domain Environment'), async (req, res) => {
    try {
        const configStrategy = await ConfigStrategy.findOne({ _id: req.params.id })
        
        if (!configStrategy) {
            return res.status(404).send()
        }

        const updates = await checkEnvironmentStatusChange(req, res, configStrategy.domain)
        
        updates.forEach((update) => configStrategy.activated.set(update, req.body[update]))
        await configStrategy.save()
        res.send(configStrategy)
    } catch (e) {
        res.status(400).send({ error: e.message })
    }
})

router.patch('/configstrategy/removeStatus/:id', auth, masterPermission('update Domain Environment'), async (req, res) => {
    try {
        const configStrategy = await ConfigStrategy.findOne({ _id: req.params.id })
        
        if (!configStrategy) {
            return res.status(404).send()
        }

        await checkEnvironmentStatusRemoval(req, res, configStrategy.domain, true)

        if (configStrategy.activated.size === 1) {
            return res.status(400).send({ error: 'Invalid operation. One environment status must be saved' })
        }

        configStrategy.activated.delete(req.body.env)
        await configStrategy.save()
        res.send(configStrategy)
    } catch (e) {
        res.status(400).send({ error: e.message })
    }
})

export default router;