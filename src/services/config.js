import { response } from './common';
import { Config } from '../models/config';
import { formatInput, verifyOwnership, checkEnvironmentStatusRemoval } from '../helpers';
import { ActionTypes, RouterTypes } from '../models/permission';
import { getDomainById, updateDomainVersion } from './domain';
import { getGroupConfigById } from './group-config';
import { checkSwitcher } from '../external/switcher-api-facade';
import { BadRequestError, NotFoundError } from '../exceptions';
import { checkEnvironmentStatusChange } from '../middleware/validators';
import { getComponentById, getComponents } from './component';
import { resolveVerification } from '../client/relay';
import { permissionCache } from '../helpers/cache';

async function verifyAddComponentInput(configId, admin) {
    const config = await getConfigById(configId);
    return verifyOwnership(admin, config, config.domain, ActionTypes.UPDATE, RouterTypes.CONFIG);
}

export async function getConfigById(id, populateAdmin = false) {
    let config = await Config.findById(id).exec();

    if (config && populateAdmin) {
        await config.populate({ path: 'admin', select: 'name' });
    }
    
    return response(config, 'Config not found');
}

export async function getConfig(where, lean = false) {
    const query = Config.findOne();

    if (where.domain) query.where('domain', where.domain);
    if (where.key) query.where('key', where.key);
    if (where.group) query.where('group', where.group);
    if (lean) query.lean();
    
    return query.exec();
}

export async function getConfigs(where, lean = false) {
    const query = Config.find();

    if (where.id) query.where('_id', where.id);
    if (where.key) query.where('key', where.key);
    if (where.domain) query.where('domain', where.domain);
    if (where.group) query.where('group', where.group);
    if (where.components) query.where('components', where.components);
    if (lean) query.lean();

    return query.exec();
}

export async function getTotalConfigsByDomainId(domain) {
    return Config.find({ domain }).countDocuments();
}

export async function populateAdmin(configs) {
    for (const config of configs) {
        await config.populate({ path: 'admin', select: 'name' });
    }
}

export async function createConfig(args, admin) {
    // validates account plan permissions
    const group = await getGroupConfigById(args.group);
    await checkSwitcher(group);

    // validates existing config
    let config = await getConfig({ 
        key: args.key,
        domain: group.domain 
    });
    
    if (config) {
        throw new BadRequestError(`Config ${args.key} already exists`);
    }

    config = new Config({
        ...args,
        domain: group.domain,
        owner: admin._id
    });

    config.key = formatInput(config.key, { toUpper: true, autoUnderscore: true });

    // validates permissions
    config = await verifyOwnership(admin, config, group.domain, ActionTypes.CREATE, RouterTypes.CONFIG);

    // creates config
    await config.save();
    updateDomainVersion(config.domain);
    
    // resets permission cache
    permissionCache.permissionReset(config.domain, ActionTypes.ALL, RouterTypes.CONFIG, config.group);

    return config;
}

export async function deleteConfig(id, admin) {
    let config = await getConfigById(id);
    config = await verifyOwnership(admin, config, config.domain, ActionTypes.DELETE, RouterTypes.CONFIG);

    await config.deleteOne();
    updateDomainVersion(config.domain);

    // resets permission cache
    permissionCache.permissionReset(config.domain, ActionTypes.ALL, RouterTypes.CONFIG, config.group);
    permissionCache.permissionReset(config.domain, ActionTypes.ALL, RouterTypes.CONFIG, config.key);
    return config;
}

export async function updateConfig(id, args, admin) {
    let config = await getConfigById(id);

    // validates existing switcher key 
    if (args.key) {
        const duplicatedKey = await getConfig({ 
            key: args.key, 
            group: config.group,
            domain: config.domain 
        });
        
        if (duplicatedKey) {
            throw new BadRequestError(`Config ${args.key} already exists`);
        }

        // resets permission cache
        permissionCache.permissionReset(config.domain, ActionTypes.ALL, RouterTypes.CONFIG, config.group);
        permissionCache.permissionReset(config.domain, ActionTypes.ALL, RouterTypes.CONFIG, config.key);
    }

    // validates existing environment
    if (args.disable_metrics) {
        await checkEnvironmentStatusChange(args, config.domain, args.disable_metrics);
    }

    // check permissions
    config = await verifyOwnership(admin, config, config.domain, ActionTypes.UPDATE, RouterTypes.CONFIG);

    // updates config
    config.updatedBy = admin.email;
    const updates = Object.keys(args);
    updates.forEach((update) => config[update] = args[update]);
    config.key = formatInput(config.key, { toUpper: true, autoUnderscore: true });
    await config.save();
    updateDomainVersion(config.domain);

    return config;
}

export async function updateConfigRelay(id, args, admin) {
    let config = await getConfigById(id);
    isRelayValid(args);
    
    const actions = [ActionTypes.UPDATE, ActionTypes.UPDATE_RELAY];

    // Verifies if the user is updating the status of the environment
    if (Object.keys(args).length == 1 && args.activated) {
        actions.push(ActionTypes.UPDATE_ENV_STATUS);
    }

    config = await verifyOwnership(admin, config, config.domain, actions, 
        RouterTypes.CONFIG, false, Object.keys(args.activated)[0]);
    config.updatedBy = admin.email;

    for (const update of Object.keys(args)) {
        if (config.relay[update] && 'activated endpoint auth_token'.indexOf(update) >= 0) {
            await checkEnvironmentStatusChange(args, config.domain, args[update]);
            Object.keys(args[update]).forEach((map) =>
                config.relay[update].set(map, args[update][map]));
        } else {
            config.relay[update] = args[update];
        }
    }
    
    await config.save();
    updateDomainVersion(config.domain);

    return config;
}

export async function updateConfigStatus(id, args, admin) {
    let config = await getConfigById(id);
    config = await verifyOwnership(admin, config, config.domain, [ActionTypes.UPDATE, ActionTypes.UPDATE_ENV_STATUS],
        RouterTypes.CONFIG, false, Object.keys(args)[0]);
    config.updatedBy = admin.email;

    const updates = await checkEnvironmentStatusChange(args, config.domain);
    
    updates.forEach((update) => config.activated.set(update, args[update]));
    await config.save();
    updateDomainVersion(config.domain);

    return config;
}

export async function removeConfigStatusEnv(id, env, admin) {
    let config = await getConfigById(id);
    config = await verifyOwnership(admin, config, config.domain, [ActionTypes.UPDATE, ActionTypes.UPDATE_ENV_STATUS],
        RouterTypes.CONFIG, false, env);
    config.updatedBy = admin.email;

    updateDomainVersion(config.domain);
    return removeConfigStatus(config, env);
}

export async function removeConfigStatus(config, environmentName) {
    try {
        await checkEnvironmentStatusRemoval(config.domain, environmentName);

        config.activated.delete(environmentName);

        if (config.relay.activated) {
            config.relay.activated.delete(environmentName);
            config.relay.endpoint.delete(environmentName);
            config.relay.auth_token.delete(environmentName);
        }

        if (config.disable_metrics) {
            config.disable_metrics.delete(environmentName);
        }

        return await config.save();
    } catch (e) {
        throw new Error(e.message);
    }
}

export async function addComponent(id, args, admin) {
    const config = await verifyAddComponentInput(id, admin);
    const component = await getComponentById(args.component);

    if (config.components.includes(component._id)) {
        throw new BadRequestError(`Component ${component.name} already exists`);
    }

    config.updatedBy = admin.email;
    config.components.push(component._id);
    await config.save();
    updateDomainVersion(config.domain);

    return config;
}

export async function removeComponent(id, args, admin) {
    const config = await verifyAddComponentInput(id, admin);
    await getComponentById(args.component);

    config.updatedBy = admin.email;
    const indexComponent = config.components.indexOf(args.component);
    config.components.splice(indexComponent, 1);
    await config.save();
    updateDomainVersion(config.domain);

    return config;
}

export async function updateComponent(id, args, admin) {
    const config = await verifyAddComponentInput(id, admin);
    const components = await getComponents({ _id: { $in: args.components } });

    if (components.length != args.components.length) {
        throw new NotFoundError('One or more component was not found');
    }

    config.updatedBy = admin.email;
    config.components = args.components;
    await config.save();
    updateDomainVersion(config.domain);

    return config;
}

export async function removeRelay(id, env, admin) {
    let config = await getConfigById(id);
    config = await verifyOwnership(admin, config, config.domain, [ActionTypes.DELETE, ActionTypes.DELETE_RELAY], 
        RouterTypes.CONFIG, false, env);
    config.updatedBy = admin.email;

    if (config.relay.activated?.get(env) != undefined) {
        if (config.relay.activated.size > 1) {
            config.relay.activated.delete(env);
            config.relay.endpoint.delete(env);
            config.relay.auth_token.delete(env);
            config.relay.verified.delete(env);
        } else {
            config.relay = undefined;
        }

        await config.save();
        updateDomainVersion(config.domain);
    }

    return config;
}

export async function verifyRelay(id, env, admin) {
    let config = await getConfigById(id);
    let domain = await getDomainById(config.domain);
    config = await verifyOwnership(admin, config, config.domain, [ActionTypes.UPDATE, ActionTypes.UPDATE_RELAY], 
        RouterTypes.CONFIG, false, env);

    const code = await resolveVerification(config.relay, env);
    if (!config.relay.verified?.get(env) && Object.is(domain.integrations.relay.verification_code, code)) {
        config.relay.verified.set(env, true);
        await config.save();
        return 'verified';
    }

    return 'failed';
}

export function isRelayValid(relay) {
    const bypass = process.env.RELAY_BYPASS_HTTPS === 'true' || false;

    if (bypass || !relay.endpoint)
        return;

    const foundNotHttps = Object.values(relay.endpoint)
        .filter(endpoint => !endpoint.toLowerCase().startsWith('https'));
    
    if (foundNotHttps.length)
        throw new BadRequestError('HTTPS required');
}

export function isRelayVerified(relay, environment) {
    const bypass = process.env.RELAY_BYPASS_VERIFICATION === 'true' || false;

    if (bypass)
        return;
    
    if (!relay.verified[environment])
        throw new BadRequestError('Relay not verified');
}