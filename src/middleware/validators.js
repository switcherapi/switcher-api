const Config = require('../models/config')

exports.masterPermission = (req, res, next) => {

    if (!req.admin.master) {
        return res.status(400).send({
            message: 'You do not have permission to create domains. Please, contact your administrator.'
        })
    }
    
    next();
}

exports.checkConfig = async (req, res, next) => {

    const config = await Config.findOne({ key: req.query.key })

    if (!config) {
        return res.status(404).send()
    }
    
    req.config = config
    next();
}