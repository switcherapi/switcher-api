import { getComponents } from './component.js';
import { createStrategy } from './config-strategy.js';
import { createConfig } from './config.js';
import { getDomainById, updateDomainVersion } from './domain.js';
import { getGroupConfig } from './group-config.js';

export async function pushChanges(domainId, environment, changes) {
    let domain = await getDomainById(domainId);

   for (const change of changes) {
        if (change.action === 'NEW') {
            await processNew(domain, change, environment);
        } else {
            return errorResponse('Request has invalid actions', domain.lastUpdate);
        }
    };

    domain = await updateDomainVersion(domainId);
    return successResponse('Changes applied successfully', domain.lastUpdate);
}

async function processNew(domain, change, environment) {
    if (change.diff === 'CONFIG') {
        await processNewConfig(domain, change, environment);
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
            await createStrategy({
                env: environment,
                description: strategy.description,
                strategy: strategy.strategy,
                values: strategy.values,
                operation: strategy.operation,
                config: config._id,
                domain: domain._id,
                owner: domain.owner
            }, admin);
        }
    }
}

function errorResponse(message, version) {
    return {
        valid: false,
        message,
        version
    };
}

function successResponse(message, version) {
    return {
        valid: true,
        message,
        version
    };
}