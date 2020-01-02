import Config from '../models/config';
import { Environment } from '../models/environment';

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

export function verifyInputUpdateParameters(allowedUpdates) {
    return function (req, res, next) {
        const updates = Object.keys(req.body);
        const isValidOperation = updates.every((update) => allowedUpdates.includes(update));

        if (!isValidOperation) {
            return res.status(400).send({ error: `Invalid update parameters` });
        }

        req.updates = updates;
        next();
    }
}
