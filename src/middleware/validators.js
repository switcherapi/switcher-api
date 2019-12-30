import Config from '../models/config';
import { Environment } from '../models/environment';

export const masterPermission = function (action) {
    return function (req, res, next) {

        if (!req.admin.master) {
            return res.status(401).send({
                error: `Unable to ${action} without a Master Admin credential`
            })
        }
        next();
    }
}

export async function checkConfig(req, res, next) {

    const config = await Config.findOne({ key: req.query.key }).lean()

    if (!config) {
        return res.status(404).send({ error: `Unable to load a key ${req.query.key}` })
    }
    
    req.config = config
    next();
}

export async function checkEnvironmentStatusChange (req, res, domain) {
    const environment = await Environment.find({ domain }).select('name -_id')
    const updates = Object.keys(req.body)
    const isValidOperation = updates.every((update) => {
        return environment.filter((e) => e.name === update).length > 0
    })

    if (!isValidOperation) {
        throw new Error('Invalid updates')
    }

    return updates
}