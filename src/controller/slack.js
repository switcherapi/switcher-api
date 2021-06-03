import { BadRequestError, NotFoundError, PermissionError } from '../exceptions';
import Slack from '../models/slack';
import { TicketStatusType, SLACK_SUB } from '../models/slack_ticket';
import { getConfig } from './config';
import { getDomainById } from './domain';
import { getEnvironment } from './environment';
import { getGroupConfig } from './group-config';

async function getSlackOrError(enterprise_id, team_id) {
    const slack = await getSlack(enterprise_id, team_id);

    if (!slack)
        throw new NotFoundError('Slack installation not found');

    return slack;
}

async function canCreateTicket(slack, ticket_content) {
    if (slack.isTicketOpened(ticket_content))
        throw new BadRequestError('Ticket already opened');

    let group, config;
    await Promise.all([
        getDomainById(slack.domain),
        getGroupConfig({ domain: slack.domain, name: ticket_content.group }),
        getEnvironment({ name: ticket_content.environment })
    ]).then(result => {
        group = result[1];

        if (!group)
            throw new NotFoundError('Group not found');
    });

    if (ticket_content.switcher) {
        config = await getConfig({ domain: slack.domain, group: group._id, key: ticket_content.switcher });
        
        if (!config)
            throw new NotFoundError('Switcher not found');
    }

}

export async function getSlack(enterprise_id, team_id) {
    const query = Slack.findOne();

    if (enterprise_id) {
        query.where('enterprise_id', enterprise_id);
    } else {
        query.where('team_id', team_id);
    }

    return query.exec();
}

export async function createSlackInstallation(args) {
    // Remove old installation
    await deleteSlack(args.enterprise_id, args.team_id);

    // Create new slack instance
    let slackInstallation = new Slack({...args});
    return slackInstallation.save();
}

export async function authorizeSlackInstallation(domain, team_id, admin) {
    const slack = await getSlackOrError(undefined, team_id);
    const _domain = await getDomainById(domain);

    if (String(_domain.owner) != String(admin._id))
        throw new PermissionError('Only the domain owner can authorize a Slack integration');

    slack.domain = domain;
    return slack.save();
}

export async function deleteSlack(enterprise_id, team_id) {
    const slack = await getSlack(enterprise_id, team_id);
    if (slack)
        return slack.remove();
}

export async function resetTicketHistory(enterprise_id, team_id, admin) {
    const slack = await getSlackOrError(enterprise_id, team_id);
    const domain = await getDomainById(slack.domain);

    if (String(domain.owner) != String(admin._id))
        throw new PermissionError('Only the domain owner can reset Ticket history');

    slack.tickets = [];
    return slack.save();
}

export async function createTicket(ticket_content, enterprise_id, team_id) {
    const slack = await getSlackOrError(enterprise_id, team_id);

    await canCreateTicket(slack, ticket_content);
    const slackTicket = {
        ...ticket_content
    };

    slack.tickets.push(slackTicket);
    const { tickets } = await slack.save();
    return tickets[tickets.length - 1];
}

export async function processTicket(enterprise_id, team_id, ticket_id, approved) {
    const slack = await getSlackOrError(enterprise_id, team_id);
    await getDomainById(slack.domain);
    const ticket = slack.tickets.filter(
        t => String(t.id) === String(ticket_id) &&
            t.ticket_status === TicketStatusType.OPENED);
    
    if (!ticket.length)
        throw new NotFoundError('Ticket not found');

    if (approved) {
        ticket[0].ticket_approvals += 1;
        
        if (slack.settings.approvals >= ticket[0].ticket_approvals) {
            ticket[0].ticket_status = TicketStatusType.APPROVED;
            await closeTicket(slack.domain, ticket[0]);
        }
    } else {
        ticket[0].ticket_status = TicketStatusType.DENIED;
        await closeTicket(null, ticket[0]);
    }

    return slack.save();
}

async function closeTicket(domain, ticket) {
    ticket.date_closed = Date.now();
    if (ticket.ticket_status === TicketStatusType.APPROVED) {
        await approveChange(domain, ticket);
    }
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
}