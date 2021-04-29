import mongoose from 'mongoose';
import { response } from './common';
import { Config } from '../models/config';
import { formatInput, removeConfigStatus, updateDomainVersion, verifyOwnership } from '../routers/common';
import { ActionTypes, RouterTypes } from '../models/role';
import { getGroupConfigById } from './group-config';
import { checkSwitcher } from '../external/switcher-api-facade';
import { BadRequestError, NotFoundError } from '../exceptions';
import { checkEnvironmentStatusChange_v2 } from '../middleware/validators';
import { getComponentById, getComponents } from './component';

async function verifyAddComponentInput(configId, admin) {
    const config = await getConfigById(configId);
    return verifyOwnership(admin, config, config.domain, ActionTypes.UPDATE, RouterTypes.CONFIG);
}

export async function getConfigById(id) {
    let config = await Config.findById(id);
    return response(config, 'Config not found');
}

export async function getConfig(where, lean = false) {
    let query = {};
    if (where.domain) query.domain = where.domain;
    if (where.key) query.key = where.key;

    return lean ? Config.findOne(query).lean() : Config.findOne(query);
}

export async function getConfigs(where) {
    let query = {};
    if (where.domain) query.domain = where.domain;
    if (where.components) query.components = where.components;

    return Config.find(query);
}

export async function getTotalConfigsByDomainId(domain) {
    return Config.find({ domain }).countDocuments();
}

export async function createConfig(args, admin) {
    // validates account plan permissions
    const group = await getGroupConfigById(args.group);
    await checkSwitcher(group);

    const query = {
        key: args.key, 
        group: group._id, 
        domain: group.domain
    };

    // validates existing config
    let config = await Config.findOne(query);
    if (config) {
        throw new BadRequestError(`Config ${config.key} already exist`);
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
    
    return config;
}

export async function deleteConfig(id, admin) {
    let config = await getConfigById(id);
    config = await verifyOwnership(admin, config, config.domain, ActionTypes.DELETE, RouterTypes.CONFIG);

    await config.remove();
    updateDomainVersion(config.domain);

    return config;
}

export async function updateConfig(id, args, admin) {
    let config = await getConfigById(id);

    const query = {
        key: args.key,
        group: config.group, 
        domain: config.domain 
    };

    // validates existing switcher key 
    if (args.key) {
        const duplicatedKey = await Config.findOne(query);

        if (duplicatedKey) {
            throw new BadRequestError(`Config ${args.key} already exist`);
        }
    }

    // modifies metrics map toggle by environment
    if (args.disable_metrics) {
        const updateMetrics = Object.keys(args.disable_metrics);
        await checkEnvironmentStatusChange_v2(args, config.domain, args.disable_metrics);
        Object.keys(args.disable_metrics[updateMetrics])
            .forEach((map) => 
                config.disable_metrics[updateMetrics]
                    .set(map, args.disable_metrics[updateMetrics][map]));
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
    config = await verifyOwnership(admin, config, config.domain, ActionTypes.UPDATE, RouterTypes.CONFIG);
    config.updatedBy = admin.email;

    for (const update of Object.keys(args)) {
        if (config.relay[update] && 'activated endpoint auth_token'.indexOf(update) >= 0) {
            await checkEnvironmentStatusChange_v2(args, config.domain, args[update]);
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
    config = await verifyOwnership(admin, config, config.domain, ActionTypes.UPDATE, RouterTypes.CONFIG);
    config.updatedBy = admin.email;

    const updates = await checkEnvironmentStatusChange_v2(args, config.domain);
    
    updates.forEach((update) => config.activated.set(update, args[update]));
    await config.save();
    updateDomainVersion(config.domain);

    return config;
}

export async function removeConfigStatusEnv(id, env, admin) {
    let config = await getConfigById(id);
    config = await verifyOwnership(admin, config, config.domain, ActionTypes.UPDATE, RouterTypes.CONFIG);
    config.updatedBy = admin.email;

    updateDomainVersion(config.domain);
    return removeConfigStatus(config, env);
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
    const componentIds = args.components.map(component => mongoose.Types.ObjectId(component));
    const components = await getComponents({ _id: { $in: componentIds } });

    if (components.length != args.components.length) {
        throw new NotFoundError('One or more component was not found');
    }

    config.updatedBy = admin.email;
    config.components = componentIds;
    await config.save();
    updateDomainVersion(config.domain);

    return config;
}

export async function removeRelay(id, env, admin) {
    let config = await getConfigById(id);
    config = await verifyOwnership(admin, config, config.domain, ActionTypes.DELETE, RouterTypes.CONFIG);
    config.updatedBy = admin.email;

    if (config.relay.activated && config.relay.activated.get(env) != undefined) {
        if (config.relay.activated.size > 1) {
            config.relay.activated.delete(env);
            config.relay.endpoint.delete(env);
            config.relay.auth_token.delete(env);
        } else {
            config.relay = {};
        }

        await config.save();
        updateDomainVersion(config.domain);
    }

    return config;
}