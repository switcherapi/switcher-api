import { Environment, EnvType } from '../../models/environment';
import Domain from '../../models/domain';
import GroupConfig from '../../models/group-config';
import Config from '../../models/config';
import { Team } from '../../models/team';
import { ConfigStrategy } from '../../models/config-strategy';
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

export async function removeDomainStatus(domainId, environmentName) {
    try {
        await checkEnvironmentStatusRemoval(domainId, environmentName)
        const domain = await Domain.findOne({ _id: domainId })
        
        if (!domain) {
            throw new Error('Domain does not exist')
        }

        domain.activated.delete(environmentName)
        return await domain.save()
    } catch (e) {
        throw new Error(e.message)
    }
}

export async function removeGroupStatus(groupId, environmentName) {
    try {
        const groupconfig = await GroupConfig.findOne({ _id: groupId })
        
        if (!groupconfig) {
            throw new Error('GroupConfig does not exist')
        }

        await checkEnvironmentStatusRemoval(groupconfig.domain, environmentName)

        groupconfig.activated.delete(environmentName)
        return await groupconfig.save()
    } catch (e) {
        throw new Error(e.message)
    }
}

export async function removeConfigStatus(configId, environmentName) {
    try {
        const config = await Config.findOne({ _id: configId })
        
        if (!config) {
            throw new Error('Config does not exist')
        }

        await checkEnvironmentStatusRemoval(config.domain, environmentName)

        config.activated.delete(environmentName)
        return await config.save()
    } catch (e) {
        throw new Error(e.message)
    }
}

export async function removeConfigStrategyStatus(strategyId, environmentName) {
    try {
        const configStrategy = await ConfigStrategy.findOne({ _id: strategyId })
        
        if (!configStrategy) {
            throw new Error('Strategy does not exist')
        }

        await checkEnvironmentStatusRemoval(configStrategy.domain, environmentName, true)

        if (configStrategy.activated.size === 1) {
            throw new Error('Invalid operation. One environment status must be saved')
        }

        configStrategy.activated.delete(environmentName)
        return await configStrategy.save()
    } catch (e) {
        throw new Error(e.message)
    }
}

export async function verifyOwnership(admin, element, domain, action, routerType) {
    try {
        if (admin._id.equals(domain.owner)) {
            return element;
        }
        
        const teams = await Team.find({ _id: { $in: admin.teams }, domain: domain._id })
        
        if (admin.teams.length) {
            for (var i = 0; i < teams.length; i++) {
                if (teams[i].active) {
                    await verifyRoles(teams[i], element, action, routerType, (err, data) => {
                        if (err) throw err;
                        element = data;
                    });
                } else {
                    throw new Error('Team is not active to verify this operation');
                }
            }
        } else {
            throw new Error('It was not possible to find any team that allows you to proceed with this operation');
        }

        return element;
    } catch (e) {
        throw Error(e.message);
    }
}
  
const verifyRoles = async function(team, element, action, routerType, callback) {
    const role = await Role.findOne({ 
        _id: { $in: team.roles }, 
        action, 
        $or: [ 
            { router: routerType }, 
            { router: RouterTypes.ALL } 
        ] 
    });

    if (role) {
        if (role.active) {
            if (action === ActionTypes.SELECT) {
                verifyIdentifiers(role, element, (err, data) => {
                    return callback(err, data);
                });
            } else {
                return callback(null, element);
            }
        } else {
            return callback(new Error('Role is not active to verify this operation'), null);
        }
    } else {
        return callback(new Error('Role not found for this operation'), null);
    }
};

const verifyIdentifiers = function(role, element, callback) {
    if (role.identifiedBy) {
        if (Array.isArray(element)) {
            if (role.values.length) {
                element = element.filter(child => role.values.includes(child[`${role.identifiedBy}`]));
                if (element) {
                    return callback(null, element);
                }
            }
        } else {
            if (role.values.includes(element[`${role.identifiedBy}`])) {
                return callback(null, element);
            }
        }
    } else {
        return callback(null, element);;
    }

    callback(new Error('It was not possible to match the requiring element to the current role'), null);
};