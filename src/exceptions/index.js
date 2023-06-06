import { Switcher } from 'switcher-client';
import Logger from '../helpers/logger';

export class NotFoundError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
        this.code = 404;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class BadRequestError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
        this.code = 400;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class PermissionError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
        this.code = 401;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class FeatureUnavailableError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

export function responseException(res, err, code, feature = undefined) {
    if (process.env.SWITCHER_API_LOGGER == 'true' && feature) {
        Logger.info(`Feature [${feature}]`, { log: Switcher.getLogger(feature) });
    }

    responseExceptionSilent(res, err, code, err.message);
}

export function responseExceptionSilent(res, err, code, message) {
    if (process.env.SWITCHER_API_LOGGER == 'true') {
        Logger.httpError(err.constructor.name, err.code, err.message, err);
    }

    if (err.code) {
        return res.status(err.code).send({ error: message });
    }

    res.status(code).send({ error: message });
}