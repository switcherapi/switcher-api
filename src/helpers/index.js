import { BadRequestError, PermissionError } from '../exceptions';
import { EnvType } from '../models/environment';
import { ActionTypes, RouterTypes } from '../models/role';
import { getDomainById } from '../controller/domain';
import { getEnvironments } from '../controller/environment';
import { getTeams } from '../controller/team';
import { getRole, getRoles } from '../controller/role';

async function checkEnvironmentStatusRemoval(domainId, environmentName, strategy = false) {
    const environment = await getEnvironments({ domain: domainId }, ['_id', 'name']);
    const isValidOperation = environment.filter((e) => 
        e.name === environmentName && 
        !strategy ? environmentName !== EnvType.DEFAULT : strategy).length > 0;
        
    if (!isValidOperation) {
        throw new BadRequestError('Invalid environment');
    }
}

export async function removeDomainStatus(domain, environmentName) {
    try {
        await checkEnvironmentStatusRemoval(domain._id, environmentName);
        domain.activated.delete(environmentName);
        return await domain.save();
    } catch (e) {
        throw new Error(e.message);
    }
}

export async function removeGroupStatus(groupconfig, environmentName) {
    try {
        await checkEnvironmentStatusRemoval(groupconfig.domain, environmentName);

        groupconfig.activated.delete(environmentName);
        return await groupconfig.save();
    } catch (e) {
        throw new Error(e.message);
    }
}

export async function removeConfigStatus(config, environmentName) {
    try {
        await checkEnvironmentStatusRemoval(config.domain, environmentName);

        config.activated.delete(environmentName);

        if (config.relay.activated) {
            config.relay.activated.delete(environmentName);
            config.relay.endpoint.delete(environmentName);
            config.relay.auth_token.delete(environmentName);
        }

        if (config.disable_metrics) {
            config.disable_metrics.delete(environmentName);
        }

        return await config.save();
    } catch (e) {
        throw new Error(e.message);
    }
}

export async function updateDomainVersion(domainId) {
    const domain = await getDomainById(domainId);
    domain.lastUpdate = Date.now();
    domain.save();
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
                element = await verifyRolesCascade(team, element, action, routerType);
            } else {
                element = await verifyRoles(team, element, action, routerType);
            }
        }
    } else {
        throw new PermissionError('It was not possible to find any team that allows you to proceed with this operation');
    }

    return element;
}
  
async function verifyRoles(team, element, action, routerType) {
    const role = await getRole({
        _id: { $in: team.roles }, 
        action: { $in: [action, ActionTypes.ALL] },
        active: true,
        router: { $in: [routerType, RouterTypes.ALL] }
    });

    if (role) {
        return verifyIdentifiers(role, element);
    } else {
        throw new PermissionError(`Role not found for this operation: '${action}' - '${routerType}'`);
    }
}

async function verifyRolesCascade(team, element, action, routerType) {
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

    const foundRole = await getRoles({
        _id: { $in: team.roles }, 
        action: { $in: [action, ActionTypes.ALL] },
        active: true,
        $or: orStatement
    });

    const matchedRole = foundRole.filter(value => value.router === routerType);
    if (matchedRole.length) {
        return verifyIdentifiers(matchedRole[0], element);
    } else if (foundRole[0]) {
        return element;
    }
}

function verifyIdentifiers(role, element) {
    if (role.identifiedBy) {
        if (Array.isArray(element)) {
            if (role.values.length) {
                element = element.filter(child => role.values.includes(child[`${role.identifiedBy}`]));
                if (element.length) {
                    return element;
                }
            }
        } else {
            if (role.values.includes(element[`${role.identifiedBy}`])) {
                return element;
            }
        }
    } else {
        return element;
    }
    throw new PermissionError('It was not possible to match the requiring element to the current role');
}