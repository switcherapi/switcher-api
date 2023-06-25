import Logger from '../../../src/helpers/logger';

describe('Helper: Logger', () => {
    beforeAll(() => {
        process.env.SWITCHER_API_LOGGER = 'true';
    });

    test('Should call logger.info', () => {
        const spy = jest.spyOn(Logger.logger, 'info');
        Logger.info('test');
        expect(spy).toHaveBeenCalled();
    });

    test('Should call logger.error', () => {
        const spy = jest.spyOn(Logger.logger, 'error');
        Logger.error('test');
        expect(spy).toHaveBeenCalled();
    });

    test('Should call logger.httpError', () => {
        const spy = jest.spyOn(Logger.logger, 'error');
        Logger.httpError('test');
        expect(spy).toHaveBeenCalled();
    });
});

describe('Helper: Logger (disabled)', () => {
    beforeAll(() => {
        process.env.SWITCHER_API_LOGGER = 'false';
    });

    test('Should call logger.info', () => {
        const spy = jest.spyOn(Logger.logger, 'info');
        Logger.info('test');
        expect(spy).not.toHaveBeenCalled();
    });

    test('Should call logger.error', () => {
        const spy = jest.spyOn(Logger.logger, 'error');
        Logger.error('test');
        expect(spy).not.toHaveBeenCalled();
    });

    test('Should call logger.httpError', () => {
        const spy = jest.spyOn(Logger.logger, 'error');
        Logger.httpError('test');
        expect(spy).not.toHaveBeenCalled();
    });
});