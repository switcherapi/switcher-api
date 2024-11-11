import { getStrategies, updateStrategy } from '../config-strategy.js';
import { getConfig, updateConfig, updateConfigRelay } from '../config.js';
import { getGroupConfig, updateGroup } from '../group-config.js';
import { ADMIN_EMAIL } from './index.js';

const DIFF_PROCESSES = Object.freeze({
    GROUP: processChangedGroup,
    CONFIG: processChangedConfig,
    STRATEGY: processChangedStrategy
});

export async function processChanged(domain, change, environment) {
    await DIFF_PROCESSES[change.diff](domain, change, environment);
}

async function processChangedGroup(domain, change, environment) {
    const admin = { _id: domain.owner, email: ADMIN_EMAIL };
    const content = change.content;
    const group = await getGroupConfig({ domain: domain._id, name: change.path[0] });

    await updateGroup(group._id, {
        description: getChangedValue(content.description, group.description),
        activated: new Map().set(environment, getChangedValue(content.activated, group.activated.get(environment)))
    }, admin);
}

async function processChangedConfig(domain, change, environment) {
    const content = change.content;
    const admin = { _id: domain.owner, email: ADMIN_EMAIL };
    const config = await getConfig({ domain: domain._id, key: change.path[1] });

    await updateConfig(config._id, {
        description: getChangedValue(content.description, config.description),
        activated: new Map().set(environment, getChangedValue(content.activated, config.activated.get(environment)))
    }, admin);

    if (content.relay) {
        await updateConfigRelay(config._id, processRelay({
            type: content.relay.relay_type,
            method: content.relay.relay_method,
            endpoint: content.relay.relay_endpoint,
            description: content.relay.description,
            activated: content.relay.activated
        }, config.relay, environment), admin);
    }
}

async function processChangedStrategy(domain, change, environment) {
    const path = change.path;
    const content = change.content;
    const admin = { _id: domain.owner, email: ADMIN_EMAIL };
    const config = await getConfig({ domain: domain._id, key: path[1] });

    const strategies = await getStrategies({ config: config._id });
    const strategy = strategies.find(strategy => strategy.strategy === path[2] && strategy.activated.has(environment));

    await updateStrategy(strategy._id, {
        description: getChangedValue(content.description, strategy.description),
        operation: getChangedValue(content.operation, strategy.operation),
        activated: new Map().set(environment, getChangedValue(content.activated, strategy.activated.get(environment))),
        values: getChangedValue(content.values, strategy.values)
    }, admin);
}

function processRelay(content, configRelay, environment) {
    return {
        type: getChangedValue(content.type, configRelay.type),
        method: getChangedValue(content.method, configRelay.method),
        description: getChangedValue(content.description, configRelay.description),
        activated: {
            [environment]: getChangedValue(content.activated, configRelay.activated?.get(environment))
        },
        endpoint: {
            [environment]: getChangedValue(content.endpoint, configRelay.endpoint?.get(environment))
        }
    };
}

function getChangedValue(changeValue, defaultValue) {
    return changeValue !== undefined ? changeValue : defaultValue;
}