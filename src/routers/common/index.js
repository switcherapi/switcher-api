import { Environment, EnvType } from '../../models/environment';
import Domain from '../../models/domain';
import { Team } from '../../models/team';
import { Role, ActionTypes, RouterTypes } from '../../models/role';

async function checkEnvironmentStatusRemoval(domainId, environmentName, strategy = false) {
    const environment = await Environment.find({ domain: domainId }).select('name -_id');
    const isValidOperation = environment.filter((e) => 
        e.name === environmentName && 
        !strategy ? environmentName !== EnvType.DEFAULT : strategy).length > 0;
        
    if (!isValidOperation) {
        throw new Error('Invalid environment');
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
    const domain = await Domain.findById(domainId);

    if (!domain) {
        throw new NotFoundError('Domain not found');
    }

    domain.lastUpdate = Date.now();
    domain.save();
}

export function formatInput(input, 
    options = { toUpper: false, toLower: false, autoUnderscore: false, allowSpace: false }) {

    const regexStr = options.autoUnderscore ? /^[a-zA-Z0-9_\- ]*$/ : 
        options.allowSpace ? /^[-a-zA-Z0-9_\- ]*$/ : /^[a-zA-Z0-9_\-]*$/;

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

export async function verifyOwnership(admin, element, domainId, action, routerType, cascade = false) {
    const domain = await Domain.findById(domainId);
    if (!domain) {
        throw new NotFoundError('Domain not found');
    }

    if (admin._id.equals(domain.owner)) {
        return element;
    }
    
    const teams = await Team.find({ _id: { $in: admin.teams }, domain: domain._id, active: true });
    if (teams.length && admin.teams.length) {
        for (var i = 0; i < teams.length; i++) {
            if (cascade) {
                element = await verifyRolesCascade(teams[i], element, action, routerType);
            } else {
                element = await verifyRoles(teams[i], element, action, routerType);
            }
        }
    } else {
        throw new PermissionError('It was not possible to find any team that allows you to proceed with this operation');
    }

    return element;
}
  
async function verifyRoles(team, element, action, routerType) {
    const role = await Role.findOne({
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
    let orStatement = []
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

    const foundRole = await Role.find({
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

export class PermissionError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class NotFoundError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class FeatureUnavailableError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

export function responseException(res, err, code) {
    if (err instanceof PermissionError) {
        res.status(401).send({ error: err.message, code: 401 });
    } else if (err instanceof NotFoundError) {
        res.status(404).send({ error: err.message });
    } else if (err instanceof FeatureUnavailableError) {
        res.status(500).send({ error: err.message });
    } else {
        res.status(code).send({ error: err.message });
    }
}