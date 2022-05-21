import { EnvType } from '../models/environment';
import Domain from '../models/domain';
import GroupConfig from '../models/group-config';
import { Config, RelayTypes} from '../models/config';
import { addMetrics } from '../models/metric';
import { ConfigStrategy, processOperation } from '../models/config-strategy';
import { ActionTypes, RouterTypes } from '../models/role';
import { verifyOwnership } from '../routers/common/index';
import { resolveNotification, resolveValidation } from './relay/index';
import Component from '../models/component';

export const resolveConfigByKey = async (domain, key) => Config.findOne({ domain, key }, null, { lean: true });

export function resolveEnvStatus(source) {
    const key = Object.keys(source.activated);
    var arrStatus = [];

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
    
    let strategies = await ConfigStrategy.find({ config: source._id, ...args }).lean();
    const environment = context.environment ? context.environment : EnvType.DEFAULT;

    strategies = strategies.filter(s => s.activated[environment] !== undefined);
    if (activated !== undefined) {
        strategies = strategies.filter(s => s.activated[environment] === activated);
    }

    try {
        if (context.admin) {
            let parentConfig = await Config.findById(source._id);
            strategies = await verifyOwnership(context.admin, strategies, parentConfig.domain, ActionTypes.READ, RouterTypes.STRATEGY);
        }
    } catch (e) {
        return null;
    }

    return strategies;
}

export async function resolveConfig(source, _id, key, activated, context) {
    const args = {};

    if (_id) { args._id = _id; }
    if (key) { args.key = key; }
    if (context._component) { args.components = context._component; }

    let configs = await Config.find({ group: source._id, ...args }).lean();

    if (activated !== undefined) {
        configs = configs.filter(config => config.activated[context.environment] === activated);
    }

    try {
        if (context.admin) {
            let parentGroup = await GroupConfig.findById(source._id);
            configs = await verifyOwnership(context.admin, configs, parentGroup.domain, ActionTypes.READ, RouterTypes.CONFIG, true);
        }
    } catch (e) {
        return null;
    }

    return configs;
}

export async function resolveGroupConfig(source, _id, name, activated, context) {
    const args = {};

    if (_id) { args._id = _id; }
    if (name) { args.name = name; }

    let groups = await GroupConfig.find({ domain: source._id, ...args }).lean();

    if (activated !== undefined) {
        groups = groups.filter(group => group.activated[context.environment] === activated);
    }

    try {
        if (context.admin) {
            groups = await verifyOwnership(context.admin, groups, source._id, ActionTypes.READ, RouterTypes.GROUP, true);
        }
    } catch (e) {
        return null;
    }

    return resolveComponentsFirst(source, context, groups);
}

export async function resolveDomain(_id, name, activated, context) {
    const args = {};

    if (_id) { args._id = _id; }
    if (name) {
        if (context.admin) {
            args.name = name; 
            args.owner = context.admin._id;
        } else {
            args._id = context.domain;
        }
    }
    
    let domain = await Domain.findOne({ ...args }).lean();
    if (activated !== undefined) {
        if (domain.activated[context.environment] !== activated) {
            return null;
        }
    }

    try {
        if (context.admin) {
            domain = await verifyOwnership(context.admin, domain, domain._id, ActionTypes.READ, RouterTypes.DOMAIN, true);
        }
    } catch (e) {
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
        const component = await Component.findOne({ domain: source._id, name: context._component });
        const validGroups = [];

        context._component = component?._id;
        for (const group of groups) {
            let configsLength = await Config.find({
                 domain: source._id, group: group._id, components: context._component 
            }).countDocuments();

            if (configsLength) {
                validGroups.push(group);
            }
        }
        return validGroups;
    }
    return groups;
}

async function checkGroup(configId) {
    const config = await Config.findOne({ _id: configId }, null, { lean: true });
    return GroupConfig.findOne({ _id: config.group }, null, { lean: true });
}

async function checkConfigStrategies(configId, strategyFilter) {
    return ConfigStrategy.find({ config: configId }, strategyFilter).lean();
}

async function resolveRelay(config, environment, entry, response) {
    try {
        if (config.relay && config.relay.activated[environment]) {
            if (config.relay.type === RelayTypes.NOTIFICATION) {
                resolveNotification(config.relay.endpoint[environment], config.relay.method, entry,
                    config.relay.auth_prefix, config.relay.auth_token[environment]);
            } else {
                const relayResponse = await resolveValidation(config.relay.endpoint[environment], config.relay.method, entry,
                    config.relay.auth_prefix, config.relay.auth_token[environment]);
                
                response.result = relayResponse.result;
                response.reason = relayResponse.result ? 'Success' : 'Relay does not agree';
                response.message = relayResponse.message;
            }
        }
    } catch (e) {
        if (config.relay.type === RelayTypes.VALIDATION) {
            response.result = false;
            response.reason = 'Relay service could not be reached';
            response.message = e.message;
        }
    }
}

function isMetricDisabled(config, environment) {
    if (config.disable_metrics && config.disable_metrics[environment]) {
        return config.disable_metrics[environment];
    }
    return false;
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

function checkStrategy(context, strategies, environment) {
    if (strategies) {
        for (const strategy of strategies) {
            if (!strategy.activated[environment]) continue;
            checkStrategyInput(context.entry ? 
                context.entry.filter(e => e.strategy == strategy.strategy) : [], 
                strategy);
        }
    }
}

function checkStrategyInput(input, strategy) {
    if (input.length) {
        if (!processOperation(strategy.strategy, strategy.operation, input[0].input, strategy.values)) {
            throw new Error(`Strategy '${strategy.strategy}' does not agree`);
        }
    } else {
        throw new Error(`Strategy '${strategy.strategy}' did not receive any input`);
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
        checkStrategy(context, strategies, environment);
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