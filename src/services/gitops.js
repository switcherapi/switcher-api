import { getComponents } from './component.js';
import { createStrategy } from './config-strategy.js';
import { createConfig, getConfig } from './config.js';
import { getDomainById, updateDomainVersion } from './domain.js';
import { createGroup, getGroupConfig } from './group-config.js';

export async function pushChanges(domainId, environment, changes) {
    const validations = validateChanges(changes);
    if (validations) {
        return errorResponse(validations);
    }

    let domain = await getDomainById(domainId);
    for (const change of changes) {
        if (change.action === 'NEW') {
            await processNew(domain, change, environment);
        }
    };

    domain = await updateDomainVersion(domainId);
    return successResponse('Changes applied successfully', domain.lastUpdate);
}

function validateChanges(changes) {
    try {
        validateActions(changes);
        validateDiff(changes);
    } catch (e) {
        return e.message;
    }
    
    return undefined;
}

function validateActions(changes) {
    const validActions = ['NEW', 'CHANGED', 'DELETED'];
    const hasInvalidAction = changes.some(change => !validActions.includes(change.action));

    if (hasInvalidAction) {
        throw new Error('Request has invalid type of change');
    }
}

function validateDiff(changes) {
    const validDiff = ['GROUP', 'CONFIG', 'STRATEGY'];
    const hasInvalidDiff = changes.some(change => !validDiff.includes(change.diff));
    
    if (hasInvalidDiff) {
        throw new Error('Request has invalid type of diff');
    }
}

async function processNew(domain, change, environment) {
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
    }
}

async function processNewGroup(domain, change, environment) {
    const admin = { _id: domain.owner };
    const group = await createGroup({
        domain: domain._id,
        name: change.content.name,
        description: change.content.description,
        activated: new Map().set(environment, change.content.activated),
        owner: domain.owner
    }, admin);

    if (change.content.configs?.length) {
        for (const config of change.content.configs) {
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
    if (change.content.components?.length) {
        const components = await getComponents({ domain: domain._id, name: { $in: change.content.components } });
        componentIds = components.map(component => component._id);
    }

    const config = await createConfig({
        domain: domain._id,
        group: group._id,
        key: content.key,
        description: content.description,
        activated: new Map().set(environment, content.activated),
        owner: domain.owner,
        components: componentIds
    }, admin);

    if (change.content.strategies?.length) {
        for (const strategy of change.content.strategies) {
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
        description: content.description,
        strategy: content.strategy,
        values: content.values,
        operation: content.operation,
        config: config._id,
        domain: domain._id,
        owner: domain.owner
    }, admin);
}

function successResponse(message, version) {
    return {
        valid: true,
        message,
        version
    };
}

function errorResponse(message) {
    return {
        valid: false,
        message
    };
}