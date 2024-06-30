import { Client } from 'switcher-client';
import Logger from '../helpers/logger.js';

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
        this.code = 403;
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
    if (feature) {
        Logger.info(`Feature [${feature}]`, { log: Client.getLogger(feature) });
    }

    responseExceptionSilent(res, err, code, err.message);
}

export function responseExceptionSilent(res, err, code, message) {
    Logger.httpError(err.constructor.name, err.code || code, message, err);

    if (err.code) {
        return res.status(err.code).send({ error: message });
    }

    res.status(code).send({ error: message });
}