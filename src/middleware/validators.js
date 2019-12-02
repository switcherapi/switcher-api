const Config = require('../models/config')

const masterPermission = function (action) {
    return function (req, res, next) {

        if (!req.admin.master) {
            return res.status(400).send({
                error: `Unable to ${action} without a Master Admin credential`
            })
        }
        next();
    }
}

const checkConfig = async (req, res, next) => {

    const config = await Config.findOne({ key: req.query.key })

    if (!config) {
        return res.status(404).send()
    }
    
    req.config = config
    next();
}

module.exports = {
    masterPermission,
    checkConfig
}