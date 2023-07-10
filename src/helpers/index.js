import { BadRequestError, PermissionError } from '../exceptions';
import { EnvType } from '../models/environment';
import { getDomainById } from '../services/domain';
import { getEnvironments } from '../services/environment';
import { getTeams } from '../services/team';
import { verifyPermissions, verifyPermissionsCascade } from './permission';

export async function checkEnvironmentStatusRemoval(domainId, environmentName, strategy = false) {
    const environment = await getEnvironments({ domain: domainId }, ['_id', 'name']);
    const isValidOperation = environment.filter((e) => 
        e.name === environmentName && 
        !strategy ? environmentName !== EnvType.DEFAULT : strategy).length > 0;
        
    if (!isValidOperation) {
        throw new BadRequestError('Invalid environment');
    }
}

export function payloadReader(payload) {
    let payloadRead = payload + '' === payload || payload || 0;
    if (Array.isArray(payloadRead))
        return payloadRead.flatMap(p => payloadReader(p));

    return Object.keys(payloadRead)
        .flatMap(field => [field, ...payloadReader(payload[field])
        .map(nestedField => `${field}.${nestedField}`)])
        .filter(field => isNaN(Number(field)))
        .reduce((acc, curr) => {
            if (!acc.includes(curr))
                acc.push(curr);
            return acc;
        }, []);
}

export function parseJSON(str) {
    try {
        return JSON.parse(str);
    } catch (e) {
        return undefined;
    }
}

export function containsValue(arr, value) {
    return arr?.filter(item => item.match(value)).length > 0;
}

export function formatInput(input, 
    options = { 
        toUpper: false, 
        toLower: false, 
        autoUnderscore: false, 
        allowSpace: false 
    }) {

    let regexStr;
    if (options.autoUnderscore) {
        regexStr = /^[a-zA-Z0-9_\- ]*$/;
    } else {
        regexStr = options.allowSpace ? /^[a-zA-Z0-9_\- ]*$/ : /^[a-zA-Z0-9_-]*$/;
    }

    if (!input.match(regexStr)) {
        throw new Error('Invalid input format. Use only alphanumeric digits.');
    }
    
    if (options.toUpper) {
        input = input.toUpperCase();
    } else if (options.toLower) {
        input = input.toLowerCase();
    }

    if (options.autoUnderscore) {
        input = input.replace(/\s/g, '_');
    }

    return input.trim();
}

export function sortBy(args) {
    const sort = {};

    if (args.sortBy) {
        const parts = args.sortBy.split(':');
        sort[parts[0]] = parts[1] === 'desc' ? -1 : 1;
    }

    return sort;
}

export function validatePagingArgs(args) {
    if (args.limit && !Number.isInteger(parseInt(args.limit)) || 
        parseInt(args.limit) < 1)
        return false;
     
    if (args.skip && !Number.isInteger(parseInt(args.skip)) ||
        parseInt(args.skip) < 0)
        return false;

    if (args.sortBy) {
        const parts = args.sortBy.split(':');

        if (parts.length != 2)
            return false;
            
        if (!parts[0].match(/^[A-Za-z]+$/))
            return false;

        if (parts[1] != 'asc' && parts[1] != 'desc')
            return false;
    }

    return true;
}

export async function verifyOwnership(admin, element, domainId, action, routerType, cascade = false, environment = undefined) {
    const domain = await getDomainById(domainId);
    if (admin._id.equals(domain.owner)) {
        return element;
    }
    
    const teams = await getTeams({ _id: { $in: admin.teams }, domain: domain._id, active: true });
    if (!teams.length || !admin.teams.length) {
        throw new PermissionError('It was not possible to find any team that allows you to proceed with this operation');
    }

    let hasPermission = [];
    let allowedElement;
    for (const team of teams) {
        if (cascade) {
            allowedElement = await verifyPermissionsCascade(team, element, action, routerType, environment);
        } else {
            allowedElement = await verifyPermissions(team, element, action, routerType, environment);
        }
        
        if (allowedElement) {
            hasPermission.push(allowedElement);
        }
    }

    if (!hasPermission.length) {
        throw new PermissionError('Action forbidden');
    }
    
    if (Array.isArray(element)) {
        hasPermission = hasPermission.flat(Infinity);
        hasPermission = [...new Set(hasPermission)];
        return hasPermission;
    }

    return element;
}