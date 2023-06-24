import axios from 'axios';
import https from 'https';
import { StrategiesToRelayDataType, RelayMethods } from '../../models/config';
import { checkHttpsAgent } from '../../external/switcher-api-facade';

const agent = async (url) => {
    const rejectUnauthorized = !(await checkHttpsAgent(url));
    return new https.Agent({ rejectUnauthorized });
};

export async function resolveNotification(relay, entry, environment) {
    const url = relay.endpoint[environment];
    const header = createHeader(relay.auth_prefix, relay.auth_token, environment);

    if (relay.method === RelayMethods.GET) {
        get(url, createParams(entry), header);
    } else {
        post(url, createBody(entry), header);
    }
}

export async function resolveValidation(relay, entry, environment) {
    let response;
    
    const url = relay.endpoint[environment];
    const header = createHeader(relay.auth_prefix, relay.auth_token, environment);

    if (relay.method === RelayMethods.GET) {
        response = await get(url, createParams(entry), header);
    } else {
        response = await post(url, createBody(entry), header);
    }

    return {
        result: response.data.result,
        message: response.data.message
    };
}

export async function resolveVerification(relay, environment) {
    const endpoint = relay.endpoint.get(environment)?.replace(/\/$/, '');
    const url = `${endpoint?.substring(0, endpoint.lastIndexOf('/'))}/verify`;
    const header = createHeader(relay.auth_prefix, relay.auth_token.get(environment));
    const response = await get(url, '', header);

    return response.data?.code;
}

async function post(url, data, headers) {
    try {
        return await axios.post(url, data, { httpsAgent: await agent(url), headers });
    } catch (error) {
        throw new Error(`Failed to reach ${url} via POST`);
    }
}

async function get(url, data, headers) {
    try {
        return await axios.get(`${url}${data}`, { httpsAgent: await agent(url), headers });
    } catch (error) {
        throw new Error(`Failed to reach ${url} via GET`);
    }
}

function createBody(entry) {
    if (entry) {
        let body = {};
        entry.forEach(e => body[StrategiesToRelayDataType[e.strategy]] = e.input);
        return body;
    }
    return null;
}

function createParams(entry) {
    if (entry) {
        const params = entry.map(e => `${StrategiesToRelayDataType[e.strategy]}=${e.input}`);
        return `?${encodeURI(params.join('&'))}`;
    }
    return '';
}

function createHeader(auth_prefix, auth_token, environment) {
    let headers = {
        ['Content-Type']: 'application/json'
    };

    if (environment) {
        if (auth_token && environment in auth_token && auth_prefix) {
            headers['Authorization'] = `${auth_prefix} ${auth_token[environment]}`;
        }
    } else if (auth_token && auth_prefix) {
        headers['Authorization'] = `${auth_prefix} ${auth_token}`;
    }

    return headers;
}