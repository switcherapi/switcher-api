import { BadRequestError, PermissionError } from '../exceptions';
import { EnvType } from '../models/environment';
import { ActionTypes, RouterTypes } from '../models/permission';
import { getDomainById } from '../services/domain';
import { getEnvironments } from '../services/environment';
import { getTeams } from '../services/team';
import { getPermission, getPermissions } from '../services/permission';

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
        payloadRead = payloadRead[0];

    return Object.keys(payloadRead)
        .flatMap(field => [field, ...payloadReader(payload[field])
        .map(nestedField => `${field}.${nestedField}`)])
        .filter(field => isNaN(Number(field)));
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
        // eslint-disable-next-line no-useless-escape
        regexStr = options.allowSpace ? /^[a-zA-Z0-9_\- ]*$/ : /^[a-zA-Z0-9_\-]*$/;
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

export async function verifyOwnership(admin, element, domainId, action, routerType, cascade = false) {
    const domain = await getDomainById(domainId);
    if (admin._id.equals(domain.owner)) {
        return element;
    }
    
    const teams = await getTeams({ _id: { $in: admin.teams }, domain: domain._id, active: true });
    if (teams.length && admin.teams.length) {
        for (const team of teams) {
            if (cascade) {
                element = await verifyPermissionsCascade(team, element, action, routerType);
            } else {
                element = await verifyPermissions(team, element, action, routerType);
            }
        }
    } else {
        throw new PermissionError('It was not possible to find any team that allows you to proceed with this operation');
    }

    return element;
}
  
async function verifyPermissions(team, element, action, routerType) {
    const permission = await getPermission({
        _id: { $in: team.permissions }, 
        action: { $in: [action, ActionTypes.ALL] },
        active: true,
        router: { $in: [routerType, RouterTypes.ALL] }
    });

    if (permission) {
        return verifyIdentifiers(permission, element);
    } else {
        throw new PermissionError(`Permission not found for this operation: '${action}' - '${routerType}'`);
    }
}

async function verifyPermissionsCascade(team, element, action, routerType) {
    let orStatement = [];
    if (routerType === RouterTypes.DOMAIN) {
        orStatement = [
            { router: routerType },
            { router: RouterTypes.GROUP },
            { router: RouterTypes.CONFIG },
            { router: RouterTypes.STRATEGY },
            { router: RouterTypes.ALL }
        ];
    } else if (routerType === RouterTypes.GROUP) {
        orStatement = [
            { router: routerType },
            { router: RouterTypes.CONFIG },
            { router: RouterTypes.STRATEGY },
            { router: RouterTypes.ALL }
        ];
    } else if (routerType === RouterTypes.CONFIG || routerType === RouterTypes.STRATEGY) {
        orStatement = [
            { router: routerType },
            { router: RouterTypes.STRATEGY },
            { router: RouterTypes.ALL }
        ];
    }

    const foundPermission = await getPermissions({
        _id: { $in: team.permissions }, 
        action: { $in: [action, ActionTypes.ALL] },
        active: true,
        $or: orStatement
    });

    const matchedPermission = foundPermission.filter(value => value.router === routerType);
    if (matchedPermission.length) {
        return verifyIdentifiers(matchedPermission[0], element);
    } else if (foundPermission[0]) {
        return element;
    }
}

function verifyIdentifiers(permission, element) {
    if (permission.identifiedBy) {
        if (Array.isArray(element)) {
            if (permission.values.length) {
                element = element.filter(child => permission.values.includes(child[`${permission.identifiedBy}`]));
                if (element.length) {
                    return element;
                }
            }
        } else {
            if (permission.values.includes(element[`${permission.identifiedBy}`])) {
                return element;
            }
        }
    } else {
        return element;
    }
    throw new PermissionError('It was not possible to match the requiring element to the current permission');
}