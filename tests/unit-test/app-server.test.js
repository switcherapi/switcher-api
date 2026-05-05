import { jest } from '@jest/globals';

const ORIGINAL_ENV = process.env;

async function loadCreateServer({
    httpServer = {},
    httpsServer = {},
    http2Server = {},
    key = 'KEY_DATA',
    cert = 'CERT_DATA'
} = {}) {
    const createHttpServer = jest.fn(() => httpServer);
    const createHttpsServer = jest.fn(() => httpsServer);
    const createHttp2Server = jest.fn(() => http2Server);
    const readFileSync = jest.fn(path => {
        if (path === process.env.SSL_KEY) {
            return key;
        }

        if (path === process.env.SSL_CERT) {
            return cert;
        }

        return `UNEXPECTED:${path}`;
    });
    const loggerInfo = jest.fn();

    jest.resetModules();
    jest.unstable_mockModule('node:http', () => ({
        default: { createServer: createHttpServer }
    }));
    jest.unstable_mockModule('node:https', () => ({
        default: { createServer: createHttpsServer }
    }));
    jest.unstable_mockModule('node:http2', () => ({
        default: { createSecureServer: createHttp2Server }
    }));
    jest.unstable_mockModule('node:fs', () => ({
        default: { readFileSync }
    }));
    jest.unstable_mockModule('../../src/helpers/logger.js', () => ({
        default: { info: loggerInfo }
    }));

    const { createServer } = await import('../../src/app-server.js');

    return {
        createServer,
        mocks: {
            createHttpServer,
            createHttpsServer,
            createHttp2Server,
            readFileSync,
            loggerInfo
        }
    };
}

describe('app-server', () => {
    beforeEach(() => {
        process.env = { ...ORIGINAL_ENV };
        delete process.env.SERVER_PROTOCOL;
        delete process.env.SSL_KEY;
        delete process.env.SSL_CERT;
    });

    afterEach(() => {
        jest.clearAllMocks();
    });

    afterAll(() => {
        process.env = ORIGINAL_ENV;
    });

    test('APP_UNIT_SUITE - Should create a cleartext HTTP/1.1 server in auto mode without TLS certs', async () => {
        const app = {};
        const server = {};
        const { createServer, mocks } = await loadCreateServer({ httpServer: server });

        const response = createServer(app);

        expect(response).toBe(server);
        expect(mocks.createHttpServer).toHaveBeenCalledWith(app);
        expect(mocks.createHttpsServer).not.toHaveBeenCalled();
        expect(mocks.createHttp2Server).not.toHaveBeenCalled();
        expect(server.switcherProtocolMode).toBe('auto');
        expect(server.switcherProtocol).toBe('http/1.1');
        expect(server.switcherTlsEnabled).toBe(false);
        expect(server.switcherAllowHttp1Fallback).toBe(false);
        expect(mocks.loggerInfo).toHaveBeenCalledWith('Server protocol selected: http/1.1', {
            mode: 'auto',
            tls: false,
            allowHttp1Fallback: false
        });
    });

    test('APP_UNIT_SUITE - Should create an HTTP/2 server in auto mode when TLS certs are provided', async () => {
        process.env.SSL_KEY = 'server.key';
        process.env.SSL_CERT = 'server.crt';

        const app = {};
        const server = {};
        const { createServer, mocks } = await loadCreateServer({ http2Server: server });

        const response = createServer(app);

        expect(response).toBe(server);
        expect(mocks.readFileSync).toHaveBeenNthCalledWith(1, 'server.key');
        expect(mocks.readFileSync).toHaveBeenNthCalledWith(2, 'server.crt');
        expect(mocks.createHttp2Server).toHaveBeenCalledWith({
            key: 'KEY_DATA',
            cert: 'CERT_DATA',
            allowHTTP1: true
        }, app);
        expect(mocks.createHttpsServer).not.toHaveBeenCalled();
        expect(mocks.createHttpServer).not.toHaveBeenCalled();
        expect(server.switcherProtocolMode).toBe('auto');
        expect(server.switcherProtocol).toBe('http2');
        expect(server.switcherTlsEnabled).toBe(true);
        expect(server.switcherAllowHttp1Fallback).toBe(true);
    });

    test('APP_UNIT_SUITE - Should create an HTTPS HTTP/1.1 server when explicitly configured', async () => {
        process.env.SERVER_PROTOCOL = 'http1';
        process.env.SSL_KEY = 'server.key';
        process.env.SSL_CERT = 'server.crt';

        const app = {};
        const server = {};
        const { createServer, mocks } = await loadCreateServer({ httpsServer: server });

        const response = createServer(app);

        expect(response).toBe(server);
        expect(mocks.createHttpsServer).toHaveBeenCalledWith({
            key: 'KEY_DATA',
            cert: 'CERT_DATA'
        }, app);
        expect(mocks.createHttp2Server).not.toHaveBeenCalled();
        expect(server.switcherProtocolMode).toBe('http1');
        expect(server.switcherProtocol).toBe('https/1.1');
        expect(server.switcherTlsEnabled).toBe(true);
        expect(server.switcherAllowHttp1Fallback).toBe(false);
    });

    test('APP_UNIT_SUITE - Should reject explicit HTTP/2 mode without TLS certs', async () => {
        process.env.SERVER_PROTOCOL = 'http2';

        const { createServer, mocks } = await loadCreateServer();

        expect(() => createServer({})).toThrow('SERVER_PROTOCOL=http2 requires SSL_CERT and SSL_KEY.');
        expect(mocks.createHttpServer).not.toHaveBeenCalled();
        expect(mocks.createHttpsServer).not.toHaveBeenCalled();
        expect(mocks.createHttp2Server).not.toHaveBeenCalled();
        expect(mocks.loggerInfo).not.toHaveBeenCalled();
    });

    test('APP_UNIT_SUITE - Should reject unsupported protocol modes', async () => {
        process.env.SERVER_PROTOCOL = 'spdy';

        const { createServer } = await loadCreateServer();

        expect(() => createServer({})).toThrow(
            "Unsupported SERVER_PROTOCOL 'spdy'. Use auto, http1, or http2."
        );
    });
});
