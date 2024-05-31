import express from 'express';
import { check, query } from 'express-validator';
import { NotFoundError, responseException } from '../exceptions/index.js';
import { auth, slackAuth } from '../middleware/auth.js';
import { validate } from '../middleware/validators.js';
import { SwitcherKeys } from '../external/switcher-api-facade.js';
import { getDomainById } from '../services/domain.js';
import * as Services from '../services/slack.js';

const router = new express.Router();

const findInstallation = async (req, res, checkDomain = false) => {
    try {
        const slack = await Services.getSlack({
            enterprise_id: req.query.enterprise_id, 
            team_id: req.query.team_id
        }, checkDomain);

        if (!slack || (checkDomain && slack.domain)) {
            throw new NotFoundError();
        }
        
        res.send(slack.installation_payload);
    } catch (e) {
        responseException(res, e, 400);
    }
};

const deleteInstallation = async (req, res) => {
    try {
        const slack = await Services.deleteSlack(
            req.query.enterprise_id, req.query.team_id);

        if (!slack) throw new NotFoundError();
        res.send({ message: 'Installation deleted' });
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

router.post('/slack/v1/installation', slackAuth, [
    check('installation_payload').exists(),
    check('bot_payload').exists()
], validate, async (req, res) => {
    try {
        const slackInstallation = await Services.createSlackInstallation(req.body);
        res.status(201).send(slackInstallation);
    } catch (e) {
        responseException(res, e, 400, SwitcherKeys.SLACK_INTEGRATION);
    }
});

router.post('/slack/v1/authorize', auth, [
    check('domain').isMongoId(),
    check('team_id').exists()
], validate, auth, async (req, res) => {
    try {
        await Services.authorizeSlackInstallation(
            req.body.domain, req.body.team_id, req.admin);

        res.status(200).send({ message: 'Authorization completed' });
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.post('/slack/v1/ticket/clear', auth, [
    check('team_id').exists()
], validate, async (req, res) => {
    try {
        await Services.resetTicketHistory(
            req.body.enterprise_id, req.body.team_id, req.admin);

        res.status(200).send({ message: 'Tickets cleared with success' });
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.post('/slack/v1/ticket/validate', slackAuth, [
    check('team_id').exists(),
    check('ticket_content.environment').exists(),
    check('ticket_content.group').exists(),
    check('ticket_content.switcher').isLength({ min: 0 }),
    check('ticket_content.status').isBoolean()
], validate, async (req, res) => {
    try {
        const ticket_content = createTicketContent(req);
        const validation = await Services.validateTicket(
            ticket_content, req.body.enterprise_id, req.body.team_id);
        
        res.status(200).send({ message: 'Ticket validated', result: validation.result });
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.post('/slack/v1/ticket/create', slackAuth, [
    check('team_id').exists(),
    check('ticket_content.environment').exists(),
    check('ticket_content.group').exists(),
    check('ticket_content.switcher').isLength({ min: 0 }),
    check('ticket_content.observations', 'Max-length is 2000').isLength({ max: 2000 }),
    check('ticket_content.status').isBoolean()
], validate, async (req, res) => {
    try {
        const ticket_content = createTicketContent(req);
        const ticket = await Services.createTicket(
            ticket_content, req.body.enterprise_id, req.body.team_id);
            
        res.status(201).send(ticket);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.post('/slack/v1/ticket/process', slackAuth, [
    check('team_id').exists(),
    check('ticket_id').isMongoId(),
    check('approved').isBoolean()
], validate, async (req, res) => {
    try {
        const ticket = await Services.processTicket(
            req.body.enterprise_id, req.body.team_id, 
            req.body.ticket_id, req.body.approved);

        res.status(200).send({ message: `Ticket ${ticket._id} processed` });
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.get('/slack/v1/findbot', slackAuth, [
    query('team_id').exists()
], validate, async (req, res) => {
    try {
        const slack = await Services.getSlack({
            enterprise_id: req.query.enterprise_id, 
            team_id: req.query.team_id
        });

        if (!slack) throw new NotFoundError();
        res.send(slack.bot_payload);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.get('/slack/v1/findinstallation', slackAuth, [
    query('team_id').exists()
], validate, async (req, res) => {
    await findInstallation(req, res);
});

router.get('/slack/v1/installation/find', auth, [
    query('team_id').exists()
], validate, async (req, res) => {
    await findInstallation(req, res, true);
});

router.get('/slack/v1/installation/:domain', auth, [
    check('domain').isMongoId()
], validate, async (req, res) => {
    try {
        const domain = await getDomainById(req.params.domain);
        const { slack_ticket, installation_payload, settings } = 
            await Services.getSlackOrError({ id: domain.integrations.slack });

        res.send({
            team_id: installation_payload.team_id,
            team_name: installation_payload.team_name,
            bot_scopes: installation_payload.bot_scopes,
            channel: installation_payload.incoming_webhook_channel,
            is_enterprise: installation_payload.is_enterprise_install,
            installed_at: installation_payload.installed_at,
            tickets_opened: slack_ticket.length,
            settings
        });
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.delete('/slack/v1/installation', slackAuth, [
    query('team_id').exists()
], validate, async (req, res) => {
    await deleteInstallation(req, res);
});

router.delete('/slack/v1/installation/decline', auth, [
    query('team_id').exists()
], validate, async (req, res) => {
    await deleteInstallation(req, res);
});

router.delete('/slack/v1/installation/unlink', auth, [
    query('domain').exists()
], validate, async (req, res) => {
    try {
        await Services.unlinkSlack(req.query.domain, req.admin);
        res.send({ message: 'Slack Integration uninstalled with success' });
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.patch('/slack/v1/settings/:param/:domain', auth, [
    check('domain').isMongoId()
], validate, async (req, res) => {
    try {
        const slack = await Services.updateSettings(req.params.domain, req.params.param, req.body);
        res.send(slack.settings);
    } catch (e) {
        responseException(res, e, 400);
    }
});

export default router;