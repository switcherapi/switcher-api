import { EnvType } from '../models/environment';
import Domain from '../models/domain';
import GroupConfig from '../models/group-config';
import { Config, RelayTypes} from '../models/config';
import { addMetrics } from '../models/metric';
import { ConfigStrategy, processOperation } from '../models/config-strategy';
import { ActionTypes, RouterTypes } from '../models/role';
import { verifyOwnership } from '../routers/common/index';
import { resolveNotification, resolveValidation } from './relay/index';

export const resolveConfigByKey = async (domain, key) => await Config.findOne({ domain, key }, null, { lean: true });

export function resolveEnvStatus(source) {
    const key = Object.keys(source.activated);
    var arrStatus = [];

    key.forEach(k => {
        arrStatus.push({
            env: k,
            value: source.activated[`${k}`]
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

    strategies = strategies.filter(s => s.activated[`${environment}`] !== undefined);
    if (activated !== undefined) {
        strategies = strategies.filter(s => s.activated[`${environment}`] === activated);
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

    let configs = await Config.find({ group: source._id, ...args }).lean();

    if (activated !== undefined) {
        configs = configs.filter(config => config.activated[`${context.environment}`] === activated);
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
        groups = groups.filter(group => group.activated[`${context.environment}`] === activated);
    }

    try {
        if (context.admin) {
            groups = await verifyOwnership(context.admin, groups, source._id, ActionTypes.READ, RouterTypes.GROUP, true);
        }
    } catch (e) {
        return null;
    }

    return groups;
}

export async function resolveDomain(_id, name, activated, context) {
    const args = {};

    if (_id) { args._id = _id; }
    if (name) { 
        args.name = name; 
        args.owner = context.admin._id;
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
    const domain = await Domain.findOne({ _id: domainId }, null, { lean: true });
    return domain;
}

async function checkGroup(configId) {
    const config = await Config.findOne({ _id: configId }, null, { lean: true });
    const group = await GroupConfig.findOne({ _id: config.group }, null, { lean: true });
    return group;
}

async function checkConfigStrategies (configId, strategyFilter) {
    const strategies = await ConfigStrategy.find({ config: configId }, strategyFilter).lean();
    return strategies;
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

export async function resolveCriteria(config, context, strategyFilter) {
    context.config_id = config._id;
    const environment = context.environment;
    let domain, group, strategies

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
        // Check flags
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
        
        // Check strategies
        if (strategies) {
            for (var i = 0; i < strategies.length; i++) {
                if (!strategies[i].activated[environment]) {
                    continue;
                }
    
                const input = context.entry ? context.entry.filter(e => e.strategy == strategies[i].strategy) : [];
                if (input.length) {
                    if (!processOperation(strategies[i].strategy, strategies[i].operation, input[0].input, strategies[i].values)) {
                        throw new Error(`Strategy '${strategies[i].strategy}' does not agree`);
                    }
                } else {
                    throw new Error(`Strategy '${strategies[i].strategy}' did not receive any input`);
                }
            }
        }

        // Check relay
        await resolveRelay(config, environment, context.entry, response);
    } catch (e) {
        response.result = false;
        response.reason = e.message;
    } finally {
        const bypassMetric = context.bypassMetric ? context.bypassMetric === 'true' : false;
        if (!bypassMetric && process.env.METRICS_ACTIVATED === 'true') {
            addMetrics(context, response);
        }
        return response;
    }
}