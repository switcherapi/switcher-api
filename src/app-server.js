import https from 'https';
import http from 'http';
import fs from 'fs';
import Logger from './helpers/logger';

export const createServer = (app) => {
    if (process.env.SSL_CERT && process.env.SSL_KEY) {
        const options = {
            key: fs.readFileSync(process.env.SSL_KEY),
            cert: fs.readFileSync(process.env.SSL_CERT)
        };

        Logger.info('SSL enabled');
        return https.createServer(options, app);
    }
    
    Logger.info('SSL disabled');
    return http.createServer(app);
};