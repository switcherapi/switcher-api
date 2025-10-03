import { validationResult } from 'express-validator';
import { BadRequestError, responseException } from '../exceptions/index.js';
import { getEnvironments } from '../services/environment.js';

export async function checkEnvironmentStatusChange(args, domain, field) {
    const environment = await getEnvironments({ domain }, ['_id', 'name']);
    const updates = Object.keys(field || args);
    const isValidOperation = updates.every((update) => {
        return environment.some((e) => e.name === update);
    });

    if (!isValidOperation) {
        throw new BadRequestError('Invalid updates');
    }

    return updates;
}

export function verifyInputUpdateParameters(allowedUpdates) {
    return function (req, res, next) {
        req.body = req.body || {};
        
        const updates = Object.keys(req.body);
        const isValidOperation = updates.every((update) => allowedUpdates.includes(update));

        if (!isValidOperation) {
            return responseException(res, new Error('Invalid update parameters'), 400);
        }

        req.updates = updates;
        next();
    };
}

export function validate(req, res, next) {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(422).json({ errors: errors.array() });
    }

    next();
}