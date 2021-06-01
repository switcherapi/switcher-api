import Domain from '../models/domain';
import Component from '../models/component';
import { ConfigStrategy } from '../models/config-strategy';
import { verifyOwnership } from '../routers/common';
import { ActionTypes, RouterTypes } from '../models/role';
import { getGroupConfigById, getGroupConfigs } from '../controller/group-config';
import { getConfigs } from '../controller/config';

export async function resolveConfigByConfig(key, domainId) {
    const config = await getConfigs({ key, domain: domainId }, true);
    if (config.length > 0) {
        return { config };
    } else {
        return undefined;
    }
}

export async function resolveGroup(domainId, groupConfig = undefined) {
    let query = {
        domain: domainId
    };

    if (groupConfig) 
        query.name = groupConfig;

    const group = await getGroupConfigs(query, true);
    if (group.length > 0) {
        return { group };
    } else {
        return undefined;
    }
}

export async function resolveFlatConfigStrategy(source, context) {
    let strategies;

    if (source.config) {
        strategies = await ConfigStrategy.find({ config: source.config[0]._id }).lean();
    } else {
        return null;
    }

    try {
        if (context.admin) {
            strategies = await verifyOwnership(
                context.admin, strategies, source.config[0].domain, ActionTypes.READ, RouterTypes.STRATEGY, true);
        }
    } catch (e) {
        return null;
    }

    return strategies;
}

export async function resolveFlatConfig(source, context) {
    let configs;
    let domainId;

    if (source.config) {
        configs = source.config;
        domainId = configs[0].domain;
    } else if (source.group) {
        configs = await getConfigs({ group: source.group.map(g => g._id) }, true);
        domainId = source.group[0].domain;
    }

    try {
        if (context.admin) {
            configs = await verifyOwnership(
                context.admin, configs, domainId, ActionTypes.READ, RouterTypes.CONFIG, true);
        }
    } catch (e) {
        return null;
    }

    return configs;
}

export async function resolveFlatGroupConfig(source, context) {
    let group;

    if (source.config) {
        group = [await getGroupConfigById(source.config[0].group, true)];
    } else if (source.group) {
        group = source.group;
    }

    try {
        if (context.admin) {
            group = await verifyOwnership(
                context.admin, group, group[0].domain, ActionTypes.READ, RouterTypes.GROUP, true);
        }
    } catch (e) {
        return null;
    }

    return group;
}

export async function resolveFlatDomain(source, context) {
    let domain;

    if (context.domain) {
        domain = await Domain.findById(context.domain).lean();
    }

    try {
        if (context.admin) {
            domain = await verifyOwnership(
                context.admin, domain, domain._id, ActionTypes.READ, RouterTypes.DOMAIN, true);
        }
    } catch (e) {
        return null;
    }

    return domain;
}

export async function resolveComponents(source) {
    const components = await Component.find( { _id: { $in: source.components } });
    return components.length ? components.map(component => component.name) : [];
}