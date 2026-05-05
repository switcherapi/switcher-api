import https from 'node:https';
import http from 'node:http';
import http2 from 'node:http2';
import fs from 'node:fs';
import Logger from './helpers/logger.js';

const SERVER_PROTOCOL = Object.freeze({
    AUTO: 'auto',
    HTTP1: 'http1',
    HTTP2: 'http2'
});

const PROTOCOL = Object.freeze({
    HTTP1: 'http/1.1',
    HTTPS_HTTP1: 'https/1.1',
    HTTP2: 'http2'
});

function getServerProtocolMode() {
    const protocol = (process.env.SERVER_PROTOCOL || SERVER_PROTOCOL.AUTO).toLowerCase();

    if (!Object.values(SERVER_PROTOCOL).includes(protocol)) {
        throw new Error(`Unsupported SERVER_PROTOCOL '${process.env.SERVER_PROTOCOL}'. Use auto, http1, or http2.`);
    }

    return protocol;
}

function isTlsEnabled() {
    return Boolean(process.env.SSL_CERT && process.env.SSL_KEY);
}

function getTlsOptions() {
    return {
        key: fs.readFileSync(process.env.SSL_KEY),
        cert: fs.readFileSync(process.env.SSL_CERT)
    };
}

function decorateServer(server, { protocol, mode, tls, allowHttp1Fallback = false }) {
    server.switcherProtocol = protocol;
    server.switcherProtocolMode = mode;
    server.switcherTlsEnabled = tls;
    server.switcherAllowHttp1Fallback = allowHttp1Fallback;

    Logger.info(`Server protocol selected: ${protocol}`, {
        mode,
        tls,
        allowHttp1Fallback
    });

    return server;
}

export const createServer = (app) => {
    const mode = getServerProtocolMode();
    const tlsEnabled = isTlsEnabled();

    if (mode === SERVER_PROTOCOL.HTTP2) {
        if (!tlsEnabled) {
            throw new Error('SERVER_PROTOCOL=http2 requires SSL_CERT and SSL_KEY.');
        }

        return decorateServer(http2.createSecureServer({
            ...getTlsOptions(),
            allowHTTP1: true
        }, app), {
            protocol: PROTOCOL.HTTP2,
            mode,
            tls: true,
            allowHttp1Fallback: true
        });
    }

    if (mode === SERVER_PROTOCOL.HTTP1) {
        if (tlsEnabled) {
            return decorateServer(https.createServer(getTlsOptions(), app), {
                protocol: PROTOCOL.HTTPS_HTTP1,
                mode,
                tls: true
            });
        }

        return decorateServer(http.createServer(app), {
            protocol: PROTOCOL.HTTP1,
            mode,
            tls: false
        });
    }

    if (tlsEnabled) {
        return decorateServer(http2.createSecureServer({
            ...getTlsOptions(),
            allowHTTP1: true
        }, app), {
            protocol: PROTOCOL.HTTP2,
            mode,
            tls: true,
            allowHttp1Fallback: true
        });
    }

    return decorateServer(http.createServer(app), {
        protocol: PROTOCOL.HTTP1,
        mode,
        tls: false
    });
};
