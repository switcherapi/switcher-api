import { getComponents } from '../component.js';
import { deleteStrategy, getStrategies } from '../config-strategy.js';
import { deleteConfig, getConfig, removeComponent } from '../config.js';
import { deleteGroup, getGroupConfig } from '../group-config.js';
import { ADMIN_EMAIL } from './index.js';

export async function processDeleted(domain, change, environment) {
    switch (change.diff) {
        case 'GROUP':
            await processGroupDeleted(domain, change);
            break;
        case 'CONFIG':
            await processConfigDeleted(domain, change);
            break;
        case 'STRATEGY':
            await processStrategyDeleted(domain, change, environment);
            break;
        case 'COMPONENT':
            await processComponentDeleted(domain, change);
            break;
    }
}

async function processGroupDeleted(domain, change) {
    const path = change.path;
    const admin = { _id: domain.owner, email: ADMIN_EMAIL };
    const group = await getGroupConfig({ domain: domain._id, name: path[0] });

    await deleteGroup(group._id, admin);
}

async function processConfigDeleted(domain, change) {
    const path = change.path;
    const admin = { _id: domain.owner, email: ADMIN_EMAIL };
    const group = await getGroupConfig({ domain: domain._id, name: path[0] });
    const config = await getConfig({ domain: domain._id, group: group._id, key: path[1] });

    await deleteConfig(config._id, admin);
}

async function processStrategyDeleted(domain, change, environment) {
    const path = change.path;
    const admin = { _id: domain.owner, email: ADMIN_EMAIL };
    const group = await getGroupConfig({ domain: domain._id, name: path[0] });
    const config = await getConfig({ domain: domain._id, group: group._id, key: path[1] });

    const strategies = await getStrategies({ config: config._id });
    const strategy = strategies.find(strategy => strategy.strategy === path[2] && strategy.activated.get(environment));

    await deleteStrategy(strategy._id, admin);
}

async function processComponentDeleted(domain, change) {
    const path = change.path;
    const content = change.content;
    const admin = { _id: domain.owner, email: ADMIN_EMAIL };
    const group = await getGroupConfig({ domain: domain._id, name: path[0] });
    const config = await getConfig({ domain: domain._id, group: group._id, key: path[1] });

    const components = await getComponents({ domain: domain._id, name: { $in: content } });
    const componentIds = components.map(component => component._id);

    for (const id of componentIds) {
        if (config.components.includes(id)) {
            await removeComponent(config._id, { component: id }, admin);
        }
    }
}