import pino from 'pino';

const logger = pino({ 
    level: process.env.SWITCHER_API_LOGGER_LEVEL || 'info',
    transport: {
        target: 'pino-pretty'
    }
});

export default class Logger {
    static get logger() {
        return logger;
    }
    
    static info(message, obj) {
        if (process.env.SWITCHER_API_LOGGER == 'true') {
            logger.info(obj, message);
        }
    }

    static error(message, err) {
        if (process.env.SWITCHER_API_LOGGER == 'true') {
            logger.error(err, message);
        }
    }

    static debug(message, obj) {
        if (process.env.SWITCHER_API_LOGGER == 'true') {
            logger.debug(obj, message);
        }
    }

    static httpError(name, code, message, err) {
        if (process.env.SWITCHER_API_LOGGER == 'true') {
            logger.error(err, `${name} [${code}]: ${message}`);
        }
    }
}