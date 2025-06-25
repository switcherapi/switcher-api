import axios from 'axios';
import https from 'https';
import { checkHttpsAgent } from '../external/switcher-api-facade.js';
import Logger from '../helpers/logger.js';

const agent = async (url) => {
    const response = await checkHttpsAgent(url);
    return new https.Agent({ rejectUnauthorized: !(response?.result) });
};

export async function resolveVerification(relay, environment) {
    try {
        const endpoint = relay.endpoint.get(environment)?.replace(/\/$/, '');
        const url = `${endpoint?.substring(0, endpoint.lastIndexOf('/'))}/verify`;
        const headers = createHeader(relay.auth_prefix, relay.auth_token.get(environment));
        const response = await axios.get(url, { httpsAgent: await agent(url), headers });

        return response.data?.code;
    } catch (error) {
        Logger.debug('resolveVerification', error);
        return undefined;
    }
}

function createHeader(auth_prefix, auth_token) {
    return {
        ['Content-Type']: 'application/json',
        ['Authorization']: `${auth_prefix} ${auth_token}`
    };
}