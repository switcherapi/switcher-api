import { NotFoundError } from '../exceptions';
import Slack from '../models/slack';
import { TicketStatusType } from '../models/slack_ticket';
import { getDomainById } from './domain';

async function getSlackOrError(enterprise_id, team_id) {
    const slack = await getSlack(enterprise_id, team_id);

    if (!slack)
        throw new NotFoundError('Slack installation not found');

    return slack;
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

export async function authorizeSlackInstallation({ domain, team_id }) {
    const slack = await getSlackOrError(undefined, team_id);
    await getDomainById(domain);
    slack.domain = domain;
    return slack.save();
}

export async function deleteSlack(enterprise_id, team_id) {
    const slack = await getSlack(enterprise_id, team_id);
    if (slack)
        return slack.remove();
}

export async function createTicket(ticketContent, enterprise_id, team_id) {
    const slack = await getSlackOrError(enterprise_id, team_id);

    await getDomainById(slack.domain);
    const slackTicket = {
        ...ticketContent
    };

    slack.tickets.push(slackTicket);
    return slack.save();
}

export async function processTicket(enterprise_id, team_id, ticket_id, approved) {
    const slack = await getSlackOrError(enterprise_id, team_id);
    await getDomainById(slack.domain);
    const ticket = slack.tickets.filter(t => String(t.id) === String(ticket_id));
    
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
        console.log('ticket approved');
    } else {
        console.log('ticket denied');
    }
}