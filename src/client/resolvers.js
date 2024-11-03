import { EnvType } from '../models/environment.js';
import Domain from '../models/domain.js';
import GroupConfig from '../models/group-config.js';
import { Config } from '../models/config.js';
import { ConfigStrategy } from '../models/config-strategy.js';
import { ActionTypes, RouterTypes } from '../models/permission.js';
import { verifyOwnership } from '../helpers/index.js';
import Component from '../models/component.js';
import Logger from '../helpers/logger.js';

export const resolveConfigByKey = async (domain, key) => Config.findOne({ domain, key }, null, { lean: true });

export function resolveEnvStatus(source) {
    const key = Object.keys(source.activated);
    const arrStatus = [];

    key.forEach(k => {
        arrStatus.push({
            env: k,
            value: source.activated[k]
        });
    });

    return arrStatus;
}

export async function resolveConfigStrategy(source, _id, strategy, operation, activated, context) {
    const args = {};

    if (_id) { args._id = _id; }
    if (strategy) { args.strategy = strategy; }
    if (operation) { args.operation = operation; }
    
    let strategies = await ConfigStrategy.find({ config: source._id, ...args }).lean().exec();
    const environment = context.environment ? context.environment : EnvType.DEFAULT;

    strategies = strategies.filter(s => s.activated[environment] !== undefined);
    if (activated !== undefined) {
        strategies = strategies.filter(s => s.activated[environment] === activated);
    }

    try {
        if (context.admin) {
            let parentConfig = await Config.findById(source._id).exec();
            strategies = await verifyOwnership(context.admin, strategies, parentConfig.domain, ActionTypes.READ, RouterTypes.STRATEGY);
        }
    } catch (e) {
        Logger.debug('resolveConfigStrategy', e);
        return null;
    }

    return strategies;
}

export async function resolveRelay(source, context) {
    const relay = source.relay;
    const environment = context.environment ? context.environment : EnvType.DEFAULT;

    if (!relay.type || !relay.activated[environment] || !relay.endpoint[environment]) {
        return null;
    }

    return relay;
}

export async function resolveConfig(source, _id, key, activated, context) {
    const args = {};

    if (_id) { args._id = _id; }
    if (key) { args.key = key; }
    if (context._component) { args.components = context._component; }
    
    let configs = await Config.find({ group: source._id, ...args }).lean().exec();
    
    if (activated !== undefined) {
        configs = configs.filter(config => isElementActive(config, context.environment, activated));
    }
    
    try {
        if (context.admin) {
            let parentGroup = await GroupConfig.findById(source._id).exec();
            configs = await verifyOwnership(context.admin, configs, parentGroup.domain, ActionTypes.READ, RouterTypes.CONFIG, true);
        }
    } catch (e) {
        Logger.debug('resolveConfig', e);
        return null;
    }

    return configs;
}

export async function resolveGroupConfig(source, _id, name, activated, context) {
    const args = {};

    if (_id) { args._id = _id; }
    if (name) { args.name = name; }

    let groups = await GroupConfig.find({ domain: source._id, ...args }).lean().exec();
    
    if (activated !== undefined) {
        groups = groups.filter(group => isElementActive(group, context.environment, activated));
    }

    try {
        if (context.admin) {
            groups = await verifyOwnership(context.admin, groups, source._id, ActionTypes.READ, RouterTypes.GROUP, true);
        }
    } catch (e) {
        Logger.debug('resolveGroupConfig', e);
        return null;
    }

    return resolveComponentsFirst(source, context, groups);
}

export async function resolveDomain(_id, name, activated, context) {
    const args = {};

    // When Admin
    if (context.admin) {
        if (name) {
            args.name = name;
            args.owner = context.admin._id;
        } else {
            args._id = _id;
        }
    // When Component / GitOps
    } else if (context.domain) {
        args._id = context.domain;
    }
    
    let domain = await Domain.findOne({ ...args }).lean().exec();
    if (activated !== undefined && !isElementActive(domain, context.environment, activated)) {
        return null;
    }

    try {
        if (context.admin) {
            domain = await verifyOwnership(context.admin, domain, domain._id, ActionTypes.READ, RouterTypes.DOMAIN, true);
        }
    } catch (e) {
        Logger.debug('resolveDomain', e);
        return null;
    }

    return domain;
}

/**
 * Elemeents (Domain, Group, Config) can be activated in different environments.
 * When the environment is not defined, the default environment activated flag is used.
 */
function isElementActive(element, environment, activated) {
    if (element?.activated[environment || EnvType.DEFAULT] === undefined) {
        return element?.activated[EnvType.DEFAULT] === activated;
    }

    return element?.activated[environment || EnvType.DEFAULT] === activated;
}

/**
 * Resolve components first is used by SDKs to filter only configurations in which the component
 * exists resulting in a snapshot size reduction.
 */
async function resolveComponentsFirst(source, context, groups) {
    if (context._component) {
        const component = await Component.findOne({ domain: source._id, name: context._component }).exec();
        const validGroups = [];

        context._component = component?._id;
        for (const group of groups) {
            let configsLength = await Config.find({
                 domain: source._id, group: group._id, components: context._component 
            }).countDocuments().exec();

            if (configsLength) {
                validGroups.push(group);
            }
        }
        return validGroups;
    }
    return groups;
}