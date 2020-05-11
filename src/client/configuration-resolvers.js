import Config from "../models/config";
import GroupConfig from "../models/group-config";
import Domain from "../models/domain";
import Component from "../models/component";
import { ConfigStrategy } from '../models/config-strategy';
import { verifyOwnership } from "../routers/common";
import { ActionTypes, RouterTypes } from "../models/role";

export async function resolveFlatConfigurationByConfig(key) {
    const config = await Config.find({ key }).lean();
    if (config.length > 0) {
        return { config }
    } else {
        return undefined;
    }
}

export async function resolveFlatConfigurationTypeByGroup(groupConfig) {
    const group = await GroupConfig.find({ name: groupConfig }).lean();
    if (group.length > 0) {
        return { group }
    } else {
        return undefined;
    }
}

export async function resolveFlatConfigStrategy(source, context) {
    let strategies;

    if (source.config) {
        strategies = await ConfigStrategy.find({ config: source.config[0]._id }).lean()
    } else {
        return null;
    }

    try {
        if (context.admin) {
            strategies = await verifyOwnership(context.admin, strategies, source.config[0].domain, ActionTypes.READ, RouterTypes.STRATEGY, true);
        }
    } catch (e) {
        return null;
    }

    return strategies

}

export async function resolveFlatConfig(source, context) {
    let configs;
    let domainId;

    if (source.config) {
        configs = source.config
        domainId = configs[0].domain
    } else if (source.group) {
        configs = await Config.find({ group: source.group[0]._id }).lean()
        domainId = source.group[0].domain
    }

    try {
        if (context.admin) {
            configs = await verifyOwnership(context.admin, configs, domainId, ActionTypes.READ, RouterTypes.CONFIG, true);
        }
    } catch (e) {
        return null;
    }

    return configs
}

export async function resolveFlatGroupConfig(source, context) {
    let group;

    if (source.config) {
        group =  await GroupConfig.find({ _id: source.config[0].group }).lean()
    } else if (source.group) {
        group = source.group
    }

    try {
        if (context.admin) {
            group = await verifyOwnership(context.admin, group, group[0].domain, ActionTypes.READ, RouterTypes.GROUP, true);
        }
    } catch (e) {
        return null;
    }

    return group
}

export async function resolveFlatDomain(source, context) {
    let domain;

    if (context.domain) {
        domain = context.domain
    } else {
        if (source.config) {
            domain = await Domain.findById(source.config[0].domain).lean()
        } else if (source.group) {
            domain = await Domain.findById(source.group[0].domain).lean()
        }
    }

    try {
        if (context.admin) {
            domain = await verifyOwnership(context.admin, domain, domain._id, ActionTypes.READ, RouterTypes.DOMAIN, true);
        }
    } catch (e) {
        return null;
    }

    return domain
}

export async function resolveComponents(source) {
    const components = await Component.find( { _id: { $in: source.components } });
    return components.length ? components.map(component => component.name) : [];
}