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

//@deprecated - created temporarily to refactory exceptions dependencies
export function responseException(res, err, code) {
    if (err.code)
        return res.status(err.code).send({ error: err.message });
    res.status(code).send({ error: err.message });
}