import { response } from './common';
import { Config } from '../models/config';
import { formatInput, updateDomainVersion, verifyOwnership } from '../routers/common';
import { ActionTypes, RouterTypes } from '../models/role';
import { getGroupConfigById } from './group';
import { checkSwitcher } from '../external/switcher-api-facade';
import { BadRequestError } from '../exceptions';
import { checkEnvironmentStatusChange_v2 } from '../middleware/validators';

export async function getConfigById(id) {
    let config = await Config.findById(id);
    return response(config, 'Config not found');
}

export async function createConfig(args, admin) {
    // validates account plan permissions
    const group = await getGroupConfigById(args.group);
    await checkSwitcher(group);

    // validates existing config
    let config = await Config.findOne({ key: args.key, group: group._id, domain: group.domain });
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

    // validates existing switcher key 
    if (args.key) {
        const duplicatedKey = await Config.findOne({ 
                key: args.key, 
                group: config.group, 
                domain: config.domain 
            });

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

    for (let index = 0; index < Object.keys(args).length; index++) {
        const update = Object.keys(args)[index];
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