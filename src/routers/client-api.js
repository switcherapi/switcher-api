const express = require('express')
const ConfigGroup = require('../models/group-config')
const ConfigStrategy = require('../models/config-strategy')
const validator = require('../middleware/validators')
const { appAuth } = require('../middleware/auth')
const router = new express.Router()

// GET /check?key=KEY
// GET /check?key=KEY&debug=true
router.get('/check', appAuth, validator.checkConfig, async (req, res) => {

    let debug = false

    if (req.query.debug) {
        debug = req.query.debug === 'true'
    }

    try {
        
        const configStrategy = await ConfigStrategy.find({ config: req.config._id }, 'activated strategy -_id')
        const configGroup = await ConfigGroup.findOne({ _id: req.config.group._id })

        const criteria = {
            key: req.config.key,
            activated: req.config.activated,
            group: configGroup.name,
            groupActivated: configGroup.activated,
            strategies: configStrategy
        }

        evaluateCriteria(criteria)

        if (!debug) {
            delete criteria.group
            delete criteria.activated
            delete criteria.groupActivated
            delete criteria.strategies
        }

        res.send(criteria)
    } catch (e) {
        console.log(e)
        res.status(404).send()
    }
})

const evaluateCriteria = (criteria) => {
    let ativated = criteria.activated && criteria.groupActivated

    if (!ativated) {
        criteria.result = false
        return criteria
    }

    criteria.strategies.forEach((strategy) => {
        if (strategy.activated) {
            // Execute strategy
            ativated = false
        }
    })

    criteria.result = ativated
    return criteria
}

module.exports = router