import { Environment, EnvType } from '../../models/environment';
import Domain from '../../models/domain';
import { Team } from '../../models/team';
import { Role, ActionTypes, RouterTypes } from '../../models/role';
import moment from 'moment';

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

// Deprecated since strategies should contain only one configured environment
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
        ]
    } else if (routerType === RouterTypes.GROUP) {
        orStatement = [
            { router: routerType },
            { router: RouterTypes.CONFIG },
            { router: RouterTypes.STRATEGY },
            { router: RouterTypes.ALL }
        ]
    } else if (routerType === RouterTypes.CONFIG || routerType === RouterTypes.STRATEGY) {
        orStatement = [
            { router: routerType },
            { router: RouterTypes.STRATEGY },
            { router: RouterTypes.ALL }
        ]
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

export function responseException(res, err, code) {
    if (err instanceof PermissionError) {
        res.status(401).send({ error: err.message })
    } else if (err instanceof NotFoundError) {
        res.status(404).send({ error: err.message })
    } else {
        res.status(code).send({ error: err.message })
    }
}

export function groupCount(list, keyName) {
    let grouped = [];
    list.forEach((item) => {
        const foundValue = grouped.filter(elem => elem[`${keyName}`] === item);
        if (foundValue.length) {
            grouped.splice(grouped.indexOf(foundValue[0]), 1);
            foundValue[0].total += 1;
            grouped.push(foundValue[0]);
        } else {
            const elem = {
                [`${keyName}`]: item,
                total: 1
            }
            grouped.push(elem);
        }
    });
    return grouped;
}

export function groupByDate(collection, collectionKeyName, keyValue, groupPattern) {
    let grouped = [];
    collection.forEach(document => {
        const key = getDocumentValueByLevel(document, collectionKeyName);
        if (key === keyValue) {
            const date = moment(document.date).format(groupPattern)
            const foundValue = grouped.filter(item => item.date === date);

            if (foundValue.length) {
                grouped.splice(grouped.indexOf(foundValue[0]), 1);
                if (document.result) {
                    foundValue[0].positive += 1;
                } else {
                    foundValue[0].negative += 1;
                }
                grouped.push(foundValue[0]);
            } else {
                let element = {};
                element.date = date;
                if (document.result) {
                    element.positive = 1;
                    element.negative = 0;
                } else {
                    element.positive = 0;
                    element.negative = 1;
                }
                grouped.push(element);
            }
        }
    })

    return grouped;
}

function getDocumentValueByLevel(document, keys) {
    if (keys.length === 1)
        return document[`${keys[0]}`];
    if (keys.length === 2)
        return document[`${keys[0]}`][`${keys[1]}`];
}