import { EnvType } from '../models/environment.js';
import Domain from '../models/domain.js';
import GroupConfig from '../models/group-config.js';
import { Config, RelayTypes} from '../models/config.js';
import { addMetrics } from '../models/metric.js';
import { ConfigStrategy, processOperation } from '../models/config-strategy.js';
import { ActionTypes, RouterTypes } from '../models/permission.js';
import { verifyOwnership } from '../helpers/index.js';
import { resolveNotification, resolveValidation } from './relay/index.js';
import Component from '../models/component.js';
import Logger from '../helpers/logger.js';
import { isRelayVerified, isRelayValid } from '../services/config.js';

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

export async function resolveConfig(source, _id, key, activated, context) {
    const args = {};

    if (_id) { args._id = _id; }
    if (key) { args.key = key; }
    if (context._component) { args.components = context._component; }
    
    let configs = await Config.find({ group: source._id, ...args }).lean().exec();
    
    if (activated !== undefined) {
        configs = configs.filter(config => config.activated[context.environment] === activated);
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
        groups = groups.filter(group => group.activated[context.environment] === activated);
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
    if (activated !== undefined && domain.activated[context.environment] !== activated) {
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

export async function checkDomain(domainId) {
    return Domain.findOne({ _id: domainId }, null, { lean: true });
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

async function checkGroup(configId) {
    const config = await Config.findOne({ _id: configId }, null, { lean: true }).exec();
    return GroupConfig.findOne({ _id: config.group }, null, { lean: true });
}

async function checkConfigStrategies(configId, strategyFilter) {
    return ConfigStrategy.find({ config: configId }, strategyFilter).lean();
}

async function resolveRelay(config, environment, entry, response) {
    try {
        if (config.relay?.activated[environment]) {
            isRelayValid(config.relay);
            isRelayVerified(config.relay, environment);
            
            if (config.relay.type === RelayTypes.NOTIFICATION) {
                resolveNotification(config.relay, entry, environment);
            } else {
                const relayResponse = await resolveValidation(config.relay, entry, environment);

                response.result = relayResponse.result;
                response.reason = relayResponse.result ? 'Success' : 'Relay does not agree';
                response.message = relayResponse.message;
                response.metadata = relayResponse.metadata;
            }
        }
    } catch (e) {
        if (config.relay.type === RelayTypes.VALIDATION) {
            response.result = false;
            response.reason = `Relay service could not be reached: ${e.message}`;
            Logger.error(response.reason, e);
        }
    }
}

function isMetricDisabled(config, environment) {
    if (config.disable_metrics[environment] === undefined) {
        return true;
    }
    
    return config.disable_metrics[environment];
}

function checkFlags(config, group, domain, environment) {
    if (config.activated[environment] === undefined ? 
        !config.activated[EnvType.DEFAULT] : !config.activated[environment]) {
        throw new Error('Config disabled');
    } else if (group.activated[environment] === undefined ? 
        !group.activated[EnvType.DEFAULT] : !group.activated[environment]) {
        throw new Error('Group disabled');
    } else if (domain.activated[environment] === undefined ? 
        !domain.activated[EnvType.DEFAULT] : !domain.activated[environment]) {
        throw new Error('Domain disabled');
    }
}

async function checkStrategy(entry, strategies, environment) {
    if (strategies) {
        for (const strategy of strategies) {
            if (!strategy.activated[environment]) {
                continue;
            }
            
            await checkStrategyInput(entry, strategy);
        }
    }
}

async function checkStrategyInput(entry, { strategy, operation, values }) {
    if (entry?.length) {
        const strategyEntry = entry.filter(e => e.strategy === strategy);
        if (strategyEntry.length == 0 || !(await processOperation(strategy, operation, strategyEntry[0].input, values))) {
            throw new Error(`Strategy '${strategy}' does not agree`);
        }
    } else {
        throw new Error(`Strategy '${strategy}' did not receive any input`);
    }
}

export async function resolveCriteria(config, context, strategyFilter) {
    context.config_id = config._id;
    const environment = context.environment;
    let domain, group, strategies;

    await Promise.all([
        checkDomain(context.domain), 
        checkGroup(config._id), 
        checkConfigStrategies(config._id, strategyFilter)
    ]).then(result => {
        domain = result[0];
        group = result[1];
        strategies = result[2];
    });
    
    let response = {
        domain,
        group,
        strategies,
        result: true,
        reason: 'Success'
    };

    try {
        checkFlags(config, group, domain, environment);
        await checkStrategy(context.entry, strategies, environment);
        await resolveRelay(config, environment, context.entry, response);
    } catch (e) {
        response.result = false;
        response.reason = e.message;
    } finally {
        const bypassMetric = context.bypassMetric ? context.bypassMetric === 'true' : false;
        if (!bypassMetric && process.env.METRICS_ACTIVATED === 'true' && 
            !isMetricDisabled(config, environment)) {
            addMetrics(context, response);
        }
    }

    return response;
}