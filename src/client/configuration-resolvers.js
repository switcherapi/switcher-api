import { verifyOwnership } from '../helpers';
import { ActionTypes, RouterTypes } from '../models/permission';
import { getGroupConfigById, getGroupConfigs } from '../services/group-config';
import { getConfigs } from '../services/config';
import { getStrategies } from '../services/config-strategy';
import { getEnvironments } from '../services/environment';
import { getSlack } from '../services/slack';
import { getDomainById } from '../services/domain';
import { getComponents } from '../services/component';

async function resolveConfigByConfig(domainId, key, configId) {
    const config = await getConfigs({ 
        id: configId, 
        key, domain: domainId 
    }, true);

    if (config.length > 0) {
        return { config };
    }

    return undefined;
}

async function resolveGroup(domainId, groupConfig, groupId) {
    const group = await getGroupConfigs({ 
        id: groupId, 
        name: groupConfig, 
        domain: domainId 
    }, true);

    if (group.length > 0) {
        return { group };
    }

    return undefined;
}

async function resolveSlackInstallation(args) {
    const slack = await getSlack({ team_id: args.slack_team_id });

    if (slack) {
        args.domain = slack.domain;
    }
}

export async function resolveConfiguration(args, context) {
    if (args.environment) {
        context.environment = args.environment;
    }

    if (args.slack_team_id) {
        await resolveSlackInstallation(args);
    }

    if (context.domain || args.domain) {
        context.environment = args.environment;
        context.domain = context.domain || args.domain;
        if (args.key || args.config_id) {
            return resolveConfigByConfig(context.domain, args.key, args.config_id);
        }

        if (args.group || args.group_id) {
            return resolveGroup(context.domain, args.group, args.group_id);
        }

        return resolveGroup(context.domain);
    }
}

export async function resolveFlatEnv(context) {
    const environments = await getEnvironments(
        { domain: context.domain }, null, { lean: true });
        
    return environments.map(e => e.name);
}

export async function resolveFlatConfigStrategy(source, context) {
    let strategies;

    if (source.config) {
        strategies = await getStrategies({ config: source.config[0]._id }, true);
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

export async function resolveFlatDomain(_source, context) {
    let domain;

    if (context.domain) {
        domain = await getDomainById(context.domain, true);
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
    const components = await getComponents({ _id: { $in: source.components } });
    return components.length ? components.map(component => component.name) : [];
}