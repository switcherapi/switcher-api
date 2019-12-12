import { Environment, EnvType } from '../../models/environment';
import Domain from '../../models/domain';
import GroupConfig from '../../models/group-config';
import Config from '../../models/config';
import { ConfigStrategy } from '../../models/config-strategy';

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
            new Error('Domain does not exist')
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
            new Error('GroupConfig does not exist')
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
            new Error('Config does not exist')
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
            new Error('Strategy does not exist')
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