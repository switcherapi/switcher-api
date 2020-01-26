import { Environment, EnvType } from '../../models/environment';
import Domain from '../../models/domain';
import { Team } from '../../models/team';
import { Role, ActionTypes, RouterTypes } from '../../models/role';

async function checkEnvironmentStatusRemoval(domainId, environmentName, strategy = false) {
    const environment = await Environment.find({ domain: domainId }).select('name -_id')
    const isValidOperation = environment.filter((e) => 
        e.name === environmentName && 
        !strategy ? environmentName !== EnvType.DEFAULT : strategy).length > 0
        
    if (!isValidOperation) {
        throw new Error('Invalid environment')
    }
}

export async function removeDomainStatus(domain, environmentName) {
    try {
        await checkEnvironmentStatusRemoval(domain._id, environmentName)
        domain.activated.delete(environmentName)
        return await domain.save()
    } catch (e) {
        throw new Error(e.message)
    }
}

export async function removeGroupStatus(groupconfig, environmentName) {
    try {
        await checkEnvironmentStatusRemoval(groupconfig.domain, environmentName)

        groupconfig.activated.delete(environmentName)
        return await groupconfig.save()
    } catch (e) {
        throw new Error(e.message)
    }
}

export async function removeConfigStatus(config, environmentName) {
    try {
        await checkEnvironmentStatusRemoval(config.domain, environmentName)

        config.activated.delete(environmentName)
        return await config.save()
    } catch (e) {
        throw new Error(e.message)
    }
}

// Deprecated since strategies should contain only one environment configured
// export async function removeConfigStrategyStatus(configStrategy, environmentName) {
//     try {
//         await checkEnvironmentStatusRemoval(configStrategy.domain, environmentName, true)

//         if (configStrategy.activated.size === 1) {
//             throw new Error('Invalid operation. One environment status must be saved')
//         }

//         configStrategy.activated.delete(environmentName)
//         return await configStrategy.save()
//     } catch (e) {
//         throw new Error(e.message)
//     }
// }

export async function verifyOwnership(admin, element, domainId, action, routerType, cascade = false) {
    const domain = await Domain.findById(domainId)

    if (!domain) {
        throw new NotFoundError('Domain not found');
    }

    if (admin._id.equals(domain.owner)) {
        return element;
    }
    
    const teams = await Team.find({ _id: { $in: admin.teams }, domain: domain._id })
    
    if (admin.teams.length) {
        for (var i = 0; i < teams.length; i++) {
            if (teams[i].active) {
                if (cascade) {
                    element = await verifyRolesCascade(teams[i], element, action, routerType);
                } else {
                    element = await verifyRoles(teams[i], element, action, routerType);
                }
            } else {
                throw new PermissionError('Team is not active to verify this operation');
            }
        }
    } else {
        throw new PermissionError('It was not possible to find any team that allows you to proceed with this operation');
    }

    return  element;
}
  
async function verifyRoles(team, element, action, routerType) {
    const role = await Role.findOne({
        _id: { $in: team.roles }, 
        action,
        active: true,
        $or: [ 
            { router: routerType }, 
            { router: RouterTypes.ALL } 
        ] 
    });

    if (role) {
        if (action === ActionTypes.READ) {
            return verifyIdentifiers(role, element);
        } else {
            return element;
        }
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
        ]
    } else if (routerType === RouterTypes.GROUP) {
        orStatement = [
            { router: routerType },
            { router: RouterTypes.CONFIG },
            { router: RouterTypes.STRATEGY },
            { router: RouterTypes.ALL }
        ]
    } else if (routerType === RouterTypes.CONFIG) {
        orStatement = [
            { router: routerType },
            { router: RouterTypes.STRATEGY },
            { router: RouterTypes.ALL }
        ]
    }

    const foundRole = await Role.findOne({
        _id: { $in: team.roles }, 
        action,
        active: true,
        identifiedBy: undefined,
        $or: orStatement
    });

    if (foundRole) {
        return element;
    }
}

function verifyIdentifiers(role, element) {
    if (role.identifiedBy) {
        if (Array.isArray(element)) {
            if (role.values.length) {
                element = element.filter(child => role.values.includes(child[`${role.identifiedBy}`]));
                if (element) {
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

export function responseException(res, err, code) {
    if (err instanceof PermissionError) {
        res.status(401).send({ error: err.message })
    } else if (err instanceof NotFoundError) {
        res.status(404).send({ error: err.message })
    } else {
        res.status(code).send({ error: err.message })
    }
}