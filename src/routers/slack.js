import express from 'express';
import { check, query } from 'express-validator';
import { NotFoundError, responseException } from '../exceptions';
import { slackAuth } from '../middleware/auth';
import * as Controller from '../controller/slack';
import { validate } from '../middleware/validators';

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

router.get('/slack/v1/findbot', [
    query('enterprise_id').exists(),
    query('team_id').exists()
], validate, slackAuth, async (req, res) => {
    try {
        const slack = await Controller.getSlack(
            req.query.enterprise_id, req.query.team_id);

        if (!slack) throw new NotFoundError();
        res.send(slack.bot_payload);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.get('/slack/v1/findinstallation', [
    query('enterprise_id').exists(),
    query('team_id').exists()
], validate, slackAuth, async (req, res) => {
    try {
        const slack = await Controller.getSlack(
            req.query.enterprise_id, req.query.team_id);

        if (!slack) throw new NotFoundError();
        res.send(slack.installation_payload);
    } catch (e) {
        responseException(res, e, 400);
    }
});

router.delete('/slack/v1/installation', [
    query('enterprise_id').exists(),
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

export default router;