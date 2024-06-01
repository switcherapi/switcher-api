import Slack from '../models/slack.js';
import { SLACK_SUB, TicketValidationType, SlackTicket } from '../models/slack_ticket.js';
import { BadRequestError, NotFoundError, PermissionError } from '../exceptions/index.js';
import { checkSlackIntegration } from '../external/switcher-api-facade.js';
import { getConfig } from './config.js';
import { getDomainById, updateDomainVersion } from './domain.js';
import { getEnvironment } from './environment.js';
import { getGroupConfig } from './group-config.js';
import { containsValue } from '../helpers/index.js';
import { isQueryValid } from './common.js';

/**
 * Validates if ticket already exists, if so, return it.
 * Otherwise, validates if ticket content is valid
 */
async function canCreateTicket(slack, ticket_content) {
    const slackTickets = await hasSlackTicket(slack, ticket_content);
        
    if (slackTickets.length) {
        return slackTickets[0];
    }

    let group, config;
    await Promise.all([
        getDomainById(slack.domain),
        getGroupConfig({ domain: slack.domain, name: ticket_content.group }),
        getEnvironment({ domain: slack.domain, name: ticket_content.environment })
    ]).then(result => {
        group = result[1];

        if (!group) {
            throw new NotFoundError('Group not found');
        }
    });

    if (ticket_content.switcher) {
        config = await getConfig({ domain: slack.domain, group: group._id, key: ticket_content.switcher });
        
        if (!config) {
            throw new NotFoundError('Switcher not found');
        }
    }
}

async function deleteSlackInstallation(slack) {
    // update Domain integrations
    if (slack.domain) {
        const domain = await getDomainById(slack.domain);
        domain.integrations.slack = null;
        domain.updatedBy = SLACK_SUB;
        await domain.save();
    }

    return slack.deleteOne();
}

async function deleteSlackTicketsBySlackId(slackId) {
    return SlackTicket.deleteMany({ slack: slackId });
}

async function hasSlackTicket(slack, ticket_content) {
    const tickets = await SlackTicket.find({ 
        slack: slack._id,
        domain: slack.domain,
        ...ticket_content
    });
    
    return tickets;
}

export async function getDomainsByTeamId(team_id) {
    const slacks = await Slack.find({ team_id });
    
    if (!slacks.length) {
        throw new NotFoundError('Slack installation not found');
    }

    const domains = await Promise.all(slacks.map(async slack => {
        const domain = await getDomainById(slack.domain);
        return {
            id: domain._id,
            name: domain.name
        };
    }));

    return domains;
}

export async function getSlackOrError(where, newInstallation = false) {
    const slack = await getSlack(where, newInstallation);

    if (!slack) {
        throw new NotFoundError('Slack installation not found');
    }

    await slack.populate({ path: 'slack_ticket' });
    return slack;
}

export async function getSlack(where, newInstallation = false) {
    if (!isQueryValid(where)) {
        throw new NotFoundError('Slack installation not found - no valid query provided');
    }

    const query = Slack.findOne();

    if (where.id) query.where('_id', where.id);
    if (where.team_id) query.where('team_id', where.team_id);
    if (where.enterprise_id) query.where('enterprise_id', where.enterprise_id);
    if (where.domain) query.where('domain', where.domain);
    if (newInstallation) query.where('domain', null);

    return query.exec();
}

export async function createSlackInstallation(args) {
    await checkSlackIntegration(args.team_id);

    // Create new slack instance
    let slackInstallation = new Slack({...args});
    return slackInstallation.save();
}

export async function authorizeSlackInstallation(args, admin) {
    const { domain, team_id } = args;
    const slack = await getSlackOrError({ team_id }, true);
    const _domain = await getDomainById(domain);

    if (String(_domain.owner) != String(admin._id)) {
        throw new PermissionError('Only the domain owner can authorize a Slack integration');
    }

    // update Domain integrations
    _domain.integrations.slack = slack._id;
    _domain.updatedBy = SLACK_SUB;
    await _domain.save();

    // update Slack domain reference
    slack.domain = domain;
    return slack.save();
}

/**
 * @param {*} enterprise_id (optional)
 */
export async function deleteSlack(args, enterprise_id) {
    const { team_id } = args;
    const slack = await getSlack({ team_id, enterprise_id });
    if (slack) {
        return deleteSlackInstallation(slack);
    }
}

export async function unlinkSlack(domainid, admin) {
    const domain = await getDomainById(domainid);

    if (String(domain.owner) != String(admin._id)) {
        throw new PermissionError('Only the domain owner can unlink integrations');
    }

    const slack = await getSlackOrError({ id: domain.integrations.slack });
    return deleteSlackInstallation(slack);
}

export async function updateSettings(domainId, param, request) {
    const domain = await getDomainById(domainId);
    const slack = await getSlackOrError({ id: domain.integrations.slack });

    if (param === TicketValidationType.IGNORED_ENVIRONMENT) {
        slack.settings.ignored_environments = request.environments;
    } else if (param === TicketValidationType.FROZEN_ENVIRONMENT) {
        slack.settings.frozen_environments = request.environments;
    } else {
        throw new BadRequestError('Invalid parameter');
    }

    return slack.save();
}

/**
 * @param {*} enterprise_id (optional)
 */
export async function resetTicketHistory(args, admin, enterprise_id) {
    const { team_id } = args;
    const slack = await getSlackOrError({ team_id, enterprise_id });
    const domain = await getDomainById(slack.domain);

    if (String(domain.owner) != String(admin._id)) {
        throw new PermissionError('Only the domain owner can reset Ticket history');
    }

    await deleteSlackTicketsBySlackId(slack._id);
}

/**
 * @param {*} enterprise_id (optional)
 */
export async function validateTicket(ticket_content, args, enterprise_id) {
    const { team_id, domain_id } = args;
    const slack = await getSlackOrError({ domain: domain_id, team_id, enterprise_id });

    const ticket = await canCreateTicket(slack, ticket_content);
    const { ignored_environments, frozen_environments } = slack.settings;

    if (containsValue(frozen_environments, ticket_content.environment)) {
        return { result: TicketValidationType.FROZEN_ENVIRONMENT };
    }

    if (containsValue(ignored_environments, ticket_content.environment)) {
        await approveChange(slack.domain, ticket_content);
        return { result: TicketValidationType.IGNORED_ENVIRONMENT };
    }

    return { result: TicketValidationType.VALIDATED, ticket};
}

/**
 * @param {*} enterprise_id (optional)
 */
export async function createTicket(ticket_content, args, enterprise_id) {
    const { team_id, domain_id } = args;
    const slack = await getSlackOrError({ domain: domain_id, team_id, enterprise_id });

    let _ticket = await canCreateTicket(slack, ticket_content);
    if (!_ticket) {
        _ticket = new SlackTicket({
            slack: slack._id,
            domain: slack.domain,
            ...ticket_content
        });

        await _ticket.save();
    }

    return {
        channel_id: slack.installation_payload.incoming_webhook_channel_id,
        channel: slack.installation_payload.incoming_webhook_channel,
        ticket: _ticket
    };
}

/**
 * @param {*} enterprise_id (optional)
 */
export async function processTicket(args, enterprise_id) {
    const { team_id, domain_id, ticket_id, approved } = args;
    const slack = await getSlackOrError({ domain: domain_id, team_id, enterprise_id });
    const ticket = slack.slack_ticket.filter(t => String(t.id) === String(ticket_id));
    
    if (!ticket.length) {
        throw new NotFoundError('Ticket not found');
    }

    if (approved) {
        await closeTicket(slack.domain, ticket[0]);
    } else {
        await closeTicket(null, ticket[0]);
    }

    return ticket[0];
}

async function closeTicket(domain, ticket) {
    ticket.date_closed = Date.now();

    // Approved when domain is provided
    if (domain) {
        await approveChange(domain, ticket);
    }

    await SlackTicket.deleteOne({ _id: ticket._id });
}

async function approveChange(domain, ticket) {
    const group = await getGroupConfig({ domain, name: ticket.group });

    if (ticket.switcher) {
        const config = await getConfig({ domain, group: group._id, key: ticket.switcher });
        config.activated.set(ticket.environment, ticket.status);
        config.updatedBy = SLACK_SUB;
        await config.save();
    } else {
        group.activated.set(ticket.environment, ticket.status);
        group.updatedBy = SLACK_SUB;
        await group.save();
    }
    
    updateDomainVersion(domain);
}