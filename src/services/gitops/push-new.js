import { getComponents } from '../component.js';
import { createStrategy } from '../config-strategy.js';
import { addComponent, createConfig, getConfig } from '../config.js';
import { createGroup, getGroupConfig } from '../group-config.js';
import { ADMIN_EMAIL } from './index.js';

export async function processNew(domain, change, environment) {
    switch (change.diff) {
        case 'GROUP':
            await processNewGroup(domain, change, environment);
            break;
        case 'CONFIG':
            await processNewConfig(domain, change, environment);
            break;
        case 'STRATEGY':
            await processNewStrategy(domain, change, environment);
            break;
        case 'COMPONENT':
            await processNewComponent(domain, change);
            break;
    }
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

    let componentIds;
    if (content.components?.length) {
        const components = await getComponents({ domain: domain._id, name: { $in: content.components } });
        componentIds = components.map(component => component._id);
    }

    const config = await createConfig({
        domain: domain._id,
        group: group._id,
        key: content.key,
        description: getNewValue(content.description, ''),
        activated: new Map().set(environment, getNewValue(content.activated, true)),
        owner: domain.owner,
        components: componentIds
    }, admin);

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