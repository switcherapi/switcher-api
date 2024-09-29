import { getStrategies, updateStrategy } from '../config-strategy.js';
import { getConfig, updateConfig } from '../config.js';
import { getGroupConfig, updateGroup } from '../group-config.js';
import { ADMIN_EMAIL } from './index.js';

export async function processChanged(domain, change, environment) {
    switch (change.diff) {
        case 'GROUP':
            await processChangedGroup(domain, change, environment);
            break;
        case 'CONFIG':
            await processChangedConfig(domain, change, environment);
            break;
        case 'STRATEGY':
            await processChangedStrategy(domain, change, environment);
            break;
    }
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
    const config = await getConfig({ domain: domain._id, key: content.key });

    await updateConfig(config._id, {
        description: getChangedValue(content.description, config.description),
        activated: new Map().set(environment, getChangedValue(content.activated, config.activated.get(environment)))
    }, admin);
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

function getChangedValue(changeValue, defaultValue) {
    return changeValue !== undefined ? changeValue : defaultValue;
}