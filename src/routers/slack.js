import express from 'express';
import { check, query } from 'express-validator';
import { checkValue, Switcher } from 'switcher-client';
import { NotFoundError, responseException } from '../exceptions';
import { auth, slackAuth } from '../middleware/auth';
import { validate } from '../middleware/validators';
import { TicketStatusType } from '../models/slack_ticket';
import { checkFeature, SwitcherKeys } from '../external/switcher-api-facade';
import { getDomainById } from '../controller/domain';
import * as Controller from '../controller/slack';

const router = new express.Router();

const findInstallation = async (req, res, checkDomain = false) => {
    try {
        const slack = await Controller.getSlack({
            enterprise_id: req.query.enterprise_id, 
            team_id: req.query.team_id
        });

        if (!slack || (checkDomain && slack.domain)) throw new NotFoundError();
        res.send(slack.installation_payload);
    } catch (e) {
        responseException(res, e, 400);
    }
};

const deleteInstallation = async (req, res) => {
    try {
        const slack = await Controller.deleteSlack(
            req.query.enterprise_id, req.query.team_id);

        if (!slack) throw new NotFoundError();
        res.send(slack);
    } catch (e) {
        responseException(res, e, 400);
    }
};

const createTicketContent = (req) => {
    return {
        environment: req.body.ticket_content.environment,
        group: req.body.ticket_content.group,
        switcher: req.body.ticket_content.switcher,
        observations: req.body.ticket_content.observations,
        status: req.body.ticket_content.status
    };
};

router.post('/slack/v1/availability', auth, async (req, res) => {
    try {
        const result = await checkFeature(
            req.body.feature, [
                checkValue(req.admin._id)
            ], [
                SwitcherKeys.SLACK_INTEGRATION, 
                SwitcherKeys.SLACK_UPDATE
            ]);

        if (process.env.SWITCHER_API_LOGGER == 'true')
            console.log('\n### Switcher API Logger ###\n' + 
                JSON.stringify(Switcher.getLogger(req.body.feature), undefined, 2));
                
        res.send({ result });
    } catch (e) {
        responseException(res, e, 400, req.body.feature);
    }
});

router.post('/slack/v1/installation', [
    check('installation_payload').exists(),
    check('bot_payload').exists()
], validate, slackAuth, async (req, res) => {
    try {
        const slackInstallation = await Controller.createSlackInstallation(req.body);
        res.status(201).send(slackInstallation);
    } catch (e) {
        responseException(res, e, 400, SwitcherKeys.SLACK_INTEGRATION);
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

router.post('/slack/v1/ticket/validate', [
    check('team_id').exists(),
    check('ticket_content.environment').exists(),
    check('ticket_content.group').exists(),
    check('ticket_content.switcher').isLength({ min: 0 }),
    check('ticket_content.status').isBoolean()
], validate, slackAuth, async (req, res) => {
    try {
        const ticket_content = createTicketContent(req);
        await Controller.validateTicket(
            ticket_content, req.body.enterprise_id, req.body.team_id);
            
        res.status(200).send({ message: 'Ticket verified' });
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
        const ticket_content = createTicketContent(req);
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
    await findInstallation(req, res);
});

router.get('/slack/v1/installation/find', [
    query('team_id').exists()
], validate, auth, async (req, res) => {
    await findInstallation(req, res, true);
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
    await deleteInstallation(req, res);
});

router.delete('/slack/v1/installation/decline', [
    query('team_id').exists()
], validate, auth, async (req, res) => {
    await deleteInstallation(req, res);
});

router.delete('/slack/v1/installation/unlink', [
    query('domain').exists()
], validate, auth, async (req, res) => {
    try {
        await Controller.unlinkSlack(req.query.domain, req.admin);
        res.send({ message: 'Slack Integration uninstalled with success' });
    } catch (e) {
        responseException(res, e, 400);
    }
});

export default router;