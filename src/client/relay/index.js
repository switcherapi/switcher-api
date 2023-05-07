import axios from 'axios';
import { StrategiesToRelayDataType, RelayMethods } from '../../models/config';

export function resolveNotification(relay, entry, environment) {
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

async function post(url, data, headers) {
    try {
        return await axios.post(url, data, headers);
    } catch (error) {
        throw new Error(`Failed to reach ${url} via POST`);
    }
}

async function get(url, data, headers) {
    try {
        return await axios.get(`${url}${data}`, headers);
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
    let headers = {};

    headers['Content-Type'] = 'application/json';

    if (auth_token && environment in auth_token && 
        auth_prefix && auth_token[environment]) {
        headers['Authorization'] = `${auth_prefix} ${auth_token[environment]}`;
    }

    return {
        headers
    };
}