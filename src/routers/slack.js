import express from 'express';
import { check, query } from 'express-validator';
import { NotFoundError, responseException } from '../exceptions';
import { auth, slackAuth } from '../middleware/auth';
import * as Controller from '../controller/slack';
import { validate } from '../middleware/validators';
import { TicketStatusType } from '../models/slack_ticket';
import { getDomainById } from '../controller/domain';

const router = new express.Router();

router.post('/slack/v1/installation', [
    check('installation_payload').exists(),
    check('bot_payload').exists()
], validate, slackAuth, async (req, res) => {
    try {
        const slackInstallation = await Controller.createSlackInstallation(req.body);
        res.status(201).send(slackInstallation);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.post('/slack/v1/authorize', [
    check('domain').isMongoId(),
    check('team_id').exists()
], validate, auth, async (req, res) => {
    try {
        await Controller.authorizeSlackInstallation(
            req.body.domain, req.body.team_id, req.admin);

        res.status(200).send({ message: 'Authorization completed' });
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.post('/slack/v1/ticket/clear', [
    check('team_id').exists()
], validate, auth, async (req, res) => {
    try {
        await Controller.resetTicketHistory(
            req.body.enterprise_id, req.body.team_id, req.admin);

        res.status(200).send({ message: 'Tickets cleared with success' });
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.post('/slack/v1/ticket/create', [
    check('team_id').exists(),
    check('ticket_content.environment').exists(),
    check('ticket_content.group').exists(),
    check('ticket_content.switcher').isLength({ min: 0 }),
    check('ticket_content.observations', 'Max-length is 2000').isLength({ max: 2000 }),
    check('ticket_content.status').isBoolean()
], validate, slackAuth, async (req, res) => {
    try {
        const ticket_content = {
            environment: req.body.ticket_content.environment,
            group: req.body.ticket_content.group,
            switcher: req.body.ticket_content.switcher,
            observations: req.body.ticket_content.observations,
            status: req.body.ticket_content.status
        };

        const ticket = await Controller.createTicket(
            ticket_content, req.body.enterprise_id, req.body.team_id);
            
        res.status(201).send(ticket);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.post('/slack/v1/ticket/process', [
    check('team_id').exists(),
    check('ticket_id').isMongoId(),
    check('approved').isBoolean()
], validate, slackAuth, async (req, res) => {
    try {
        const ticket = await Controller.processTicket(
            req.body.enterprise_id, req.body.team_id, 
            req.body.ticket_id, req.body.approved);

        res.status(200).send({ message: `Ticket ${ticket._id} processed` });
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.get('/slack/v1/findbot', [
    query('team_id').exists()
], validate, slackAuth, async (req, res) => {
    try {
        const slack = await Controller.getSlack({
            enterprise_id: req.query.enterprise_id, 
            team_id: req.query.team_id
        });

        if (!slack) throw new NotFoundError();
        res.send(slack.bot_payload);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.get('/slack/v1/findinstallation', [
    query('team_id').exists()
], validate, slackAuth, async (req, res) => {
    try {
        const slack = await Controller.getSlack({
            enterprise_id: req.query.enterprise_id, 
            team_id: req.query.team_id
        });

        if (!slack) throw new NotFoundError();
        res.send(slack.installation_payload);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.get('/slack/v1/installation/:domain', [
    check('domain').isMongoId()
], validate, auth, async (req, res) => {
    try {
        const domain = await getDomainById(req.params.domain);
        const { tickets, installation_payload, settings } = 
            await Controller.getSlackOrError({ id: domain.integrations.slack });

        const openedTickets = tickets.filter(t => t.ticket_status === TicketStatusType.OPENED).length;
        const approvedTickets = tickets.filter(t => t.ticket_status === TicketStatusType.APPROVED).length;

        res.send({
            team_id: installation_payload.team_id,
            team_name: installation_payload.team_name,
            bot_scopes: installation_payload.bot_scopes,
            channel: installation_payload.incoming_webhook_channel,
            is_enterprise: installation_payload.is_enterprise_install,
            installed_at: installation_payload.installed_at,
            tickets_opened: openedTickets,
            tickets_approved: approvedTickets,
            tickets_denied: (tickets.length - openedTickets - approvedTickets),
            settings
        });
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.delete('/slack/v1/installation', [
    query('team_id').exists()
], validate, slackAuth, async (req, res) => {
    try {
        const slack = await Controller.deleteSlack(
            req.query.enterprise_id, req.query.team_id);

        if (!slack) throw new NotFoundError();
        res.send(slack);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.delete('/slack/v1/installation/unlink', [
    query('domain').exists()
], validate, auth, async (req, res) => {
    try {
        const slack = await Controller.unlinkSlack(req.query.domain, req.admin);
        res.send(slack);
    } catch (e) {
        responseException(res, e, 400);
    }
});

export default router;