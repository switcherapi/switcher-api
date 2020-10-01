import axios from 'axios';
import { StrategiesToRelayDataType, RelayMethods } from '../../models/config';

export function resolveNotification(url, method, entry, auth_prefix, auth_token) {
    if (method === RelayMethods.GET) {
        get(url, createParams(entry), createHeader(auth_prefix, auth_token));
    } else {
        post(url, createBody(entry), createHeader(auth_prefix, auth_token));
    }
}

export async function resolveValidation(url, method, entry, auth_prefix, auth_token) {
    let response;
    if (method === RelayMethods.GET) {
        response = await get(url, createParams(entry), createHeader(auth_prefix, auth_token));
    } else {
        response = await post(url, createBody(entry), createHeader(auth_prefix, auth_token));
    }

    return {
        result: response.data.result,
        message: response.data.message
    };
}

async function post(url, data, headers) {
    try {
        return axios.post(url, data, headers);
    } catch (error) {
        throw new Error(`Failed to reach ${url} via POST`);
    }
}

async function get(url, data, headers) {
    try {
        return axios.get(`${url}${data}`, headers);
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

function createHeader(auth_prefix, auth_token) {
    let headers = {};

    headers['Content-Type'] = 'application/json';
    if (auth_prefix)
        headers['Authorization'] = `${auth_prefix} ${auth_token}`;
        
    return {
        headers
    };
}