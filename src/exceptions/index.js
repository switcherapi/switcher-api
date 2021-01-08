export class NotFoundError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class BadRequestError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

//@deprecated - created temporarily to refactory exceptions dependencies
export function responseException(res, err, code) {
    if (err instanceof BadRequestError) {
        res.status(400).send({ error: err.message });
    } else if (err instanceof NotFoundError) {
        res.status(404).send({ error: err.message });
    } else {
        res.status(code).send({ error: err.message });
    }
}