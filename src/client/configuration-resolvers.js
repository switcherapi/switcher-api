import { verifyOwnership } from '../routers/common';
import { ActionTypes, RouterTypes } from '../models/role';
import { getGroupConfigById, getGroupConfigs } from '../controller/group-config';
import { getConfigs } from '../controller/config';
import { getStrategies } from '../controller/config-strategy';
import { getEnvironments } from '../controller/environment';
import { getSlack } from '../controller/slack';
import { getDomainById } from '../controller/domain';
import { getComponents } from '../controller/component';

async function resolveConfigByConfig(key, domainId) {
    const config = await getConfigs({ key, domain: domainId }, true);
    if (config.length > 0) {
        return { config };
    } else {
        return undefined;
    }
}

async function resolveGroup(domainId, groupConfig = undefined) {
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
        if (args.key) {
            return resolveConfigByConfig(args.key, context.domain);
        }

        if (args.group) {
            return resolveGroup(context.domain, args.group);
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

export async function resolveFlatDomain(source, context) {
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