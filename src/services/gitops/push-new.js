import { getComponents } from '../component.js';
import { createStrategy } from '../config-strategy.js';
import { addComponent, createConfig, getConfig } from '../config.js';
import { createGroup, getGroupConfig } from '../group-config.js';
import { ADMIN_EMAIL } from './index.js';

const DIFF_PROCESSES = Object.freeze({
    GROUP: processNewGroup,
    CONFIG: processNewConfig,
    STRATEGY: processNewStrategy,
    COMPONENT: processNewComponent
});

export async function processNew(domain, change, environment) {
    await DIFF_PROCESSES[change.diff](domain, change, environment);
}

async function processNewGroup(domain, change, environment) {
    const admin = { _id: domain.owner };
    const content = change.content;
    const group = await createGroup({
        domain: domain._id,
        name: content.name,
        description: getNewValue(content.description, ''),
        activated: new Map().set(environment, getNewValue(content.activated, true)),
        owner: domain.owner
    }, admin);

    if (content.config?.length) {
        for (const config of content.config) {
            await processNewConfig(domain, {
                path: [group.name],
                content: config
            }, environment);
        }
    }
}

async function processNewConfig(domain, change, environment) {
    const path = change.path;
    const content = change.content;
    const admin = { _id: domain.owner };
    const group = await getGroupConfig({ domain: domain._id, name: path[0] });

    const newConfig = {
        domain: domain._id,
        group: group._id,
        key: content.key,
        description: getNewValue(content.description, ''),
        activated: new Map().set(environment, getNewValue(content.activated, true)),
        owner: domain.owner,
    };

    if (content.components?.length) {
        const components = await getComponents({ domain: domain._id, name: { $in: content.components } });
        newConfig.components = components.map(component => component._id);
    }

    if (content.relay) {
        newConfig.relay = {
            type: content.relay.type,
            method: content.relay.method,
            endpoint: {
                [environment]: content.relay.endpoint
            },
            description: content.relay.description,
            activated: {
                [environment]: getNewValue(content.relay.activated, true)
            }
        };
    }

    const config = await createConfig(newConfig, admin);

    if (content.strategies?.length) {
        for (const strategy of content.strategies) {
            await processNewStrategy(domain, {
                path: [group.name, config.key],
                content: strategy
            }, environment);
        }
    }
}

async function processNewStrategy(domain, change, environment) {
    const path = change.path;
    const content = change.content;
    const admin = { _id: domain.owner };
    const config = await getConfig({ domain: domain._id, key: path[1] });

    await createStrategy({
        env: environment,
        description: getNewValue(content.description, ''),
        strategy: content.strategy,
        values: content.values,
        operation: content.operation,
        config: config._id,
        domain: domain._id,
        owner: domain.owner
    }, admin, getNewValue(content.activated, true));
}

async function processNewComponent(domain, change) {
    const path = change.path;
    const content = change.content;
    const admin = { _id: domain.owner, email: ADMIN_EMAIL };
    const config = await getConfig({ domain: domain._id, key: path[1] });

    const components = await getComponents({ domain: domain._id, name: { $in: content } });
    const componentIds = components.map(component => component._id);

    for (const id of componentIds) {
        if (!config.components.includes(id)) {
            await addComponent(config._id, { component: id }, admin);
        }
    }
}

function getNewValue(newValue, defaultValue) {
    return newValue !== undefined ? newValue : defaultValue;
}