import pino from 'pino';

const logger = pino({ 
    transport: {
        target: 'pino-pretty'
    }
});

export default class Logger {

    static info(message, obj) {
        logger.info(obj, message);
    }

    static error(message, err) {
        logger.error(err, message);
    }

    static httpError(name, code, message, err) {
        logger.error(err, `${name} [${code}]: ${message}`);
    }
}