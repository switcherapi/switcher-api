import mongoose from 'mongoose';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import * as Controller from '../src/controller/slack';
import { mock1_slack_installation } from './fixtures/db_slack';
import Slack from '../src/models/slack';

afterAll(async () => {
    await Slack.deleteMany();
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mongoose.disconnect();
});

const generateToken = (expiresIn) => {
    return jwt.sign(({ 
        iss: 'Switcher Slack App',
        sub: '/resource' 
    }), process.env.SWITCHER_SLACK_JWT_SECRET, {
        expiresIn
    });
};

describe('Slack Installation', () => {

    test('SLACK_SUITE - Should save installation', async () => {
        const response = await request(app)
            .post('/slack/v1/installation')
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send(mock1_slack_installation).expect(201);

        expect(response.body.team_id).toBe(mock1_slack_installation.team_id);
        expect(response.body.installation_payload).toMatchObject(
            mock1_slack_installation.installation_payload);
        expect(response.body.bot_payload).toMatchObject(
                mock1_slack_installation.bot_payload);
    });

    test('SLACK_SUITE - Should save installation - Enterprise Account', async () => {
        const enterpriseSlack = Object.assign({}, mock1_slack_installation);
        enterpriseSlack.enterprise_id = 'ENTERPRISE_ACCNT';

        const response = await request(app)
            .post('/slack/v1/installation')
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send(enterpriseSlack).expect(201);

        expect(response.body.enterprise_id).toBe(enterpriseSlack.enterprise_id);
        expect(response.body.installation_payload).toMatchObject(
            enterpriseSlack.installation_payload);
        expect(response.body.bot_payload).toMatchObject(
            enterpriseSlack.bot_payload);
    });

    test('SLACK_SUITE - Should NOT save installation - Token expired', async () => {
        await request(app)
            .post('/slack/v1/installation')
            .set('Authorization', `Bearer ${generateToken('0ms')}`)
            .send(mock1_slack_installation).expect(401);
    });

    test('SLACK_SUITE - Should NOT save installation - Missing installation payload', async () => {
        //given
        const slack = Object.assign({}, mock1_slack_installation);
        delete slack.installation_payload;
        
        //test
        await request(app)
            .post('/slack/v1/installation')
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send(slack).expect(422);
    });

    test('SLACK_SUITE - Should find bot', async () => {
        //given
        const installation = Object.assign({}, mock1_slack_installation);
        installation.team_id = 'T_FIND_BOT';
        installation.bot_payload.app_id = 'TEST_FIND_BOT1';
        await Controller.createSlackInstallation(installation);

        //test
        const response = await request(app)
            .get(`/slack/v1/findbot?enterprise_id=&team_id=${installation.team_id}`)
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send().expect(200);

        expect(response.body).toMatchObject(installation.bot_payload);
    });

    test('SLACK_SUITE - Should NOT find bot - Not found', async () => {
        await request(app)
            .get('/slack/v1/findbot?enterprise_id=&team_id=NOT_FOUND')
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send().expect(404);
    });

    test('SLACK_SUITE - Should NOT find bot - Missing param', async () => {
        await request(app)
            .get('/slack/v1/findbot')
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send().expect(422);
    });

    test('SLACK_SUITE - Should find installation', async () => {
        //given
        const installation = Object.assign({}, mock1_slack_installation);
        installation.team_id = 'T_FIND_INSTALL';
        installation.installation_payload.app_id = 'TEST_FIND_INSTALLATION1';
        await Controller.createSlackInstallation(installation);

        //test
        const response = await request(app)
            .get(`/slack/v1/findinstallation?enterprise_id=&team_id=${installation.team_id}`)
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send().expect(200);

        expect(response.body).toMatchObject(installation.installation_payload);
    });

    test('SLACK_SUITE - Should NOT find installation - Not found', async () => {
        await request(app)
            .get('/slack/v1/findinstallation?enterprise_id=&team_id=NOT_FOUND')
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send().expect(404);
    });

    test('SLACK_SUITE - Should NOT find installation - Missing param', async () => {
        await request(app)
            .get('/slack/v1/findinstallation')
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send().expect(422);
    });

    test('SLACK_SUITE - Should delete installation', async () => {
        //given
        const installation = Object.assign({}, mock1_slack_installation);
        installation.team_id = 'T_DELETE_INSTALL';
        installation.installation_payload.app_id = 'TEST_DELETE_INSTALLATION1';
        await Controller.createSlackInstallation(installation);

        //test
        await request(app)
            .delete(`/slack/v1/deleteinstallation?enterprise_id=&team_id=${installation.team_id}`)
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send().expect(200);

        //check DB
        const slackDb = await Controller.getSlack(installation.enterprise_id, installation.team_id);
        expect(slackDb).toBe(null);
    });

    test('SLACK_SUITE - Should NOT delete installation - Not found', async () => {
        await request(app)
            .delete('/slack/v1/deleteinstallation?enterprise_id=&team_id=NOT_FOUND')
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send().expect(404);
    });

    test('SLACK_SUITE - Should NOT delete installation - Missing param', async () => {
        await request(app)
            .delete('/slack/v1/deleteinstallation')
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send().expect(422);
    });

    test('SLACK_SUITE - Should delete bot', async () => {
        //given
        const installation = Object.assign({}, mock1_slack_installation);
        installation.team_id = 'T_DELETE_BOT';
        installation.installation_payload.app_id = 'TEST_DELETE_BOT1';
        await Controller.createSlackInstallation(installation);

        //test
        await request(app)
            .delete(`/slack/v1/deletebot?enterprise_id=&team_id=${installation.team_id}`)
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send().expect(200);

        //check DB
        const slackDb = await Controller.getSlack(installation.enterprise_id, installation.team_id);
        expect(slackDb).toBe(null);
    });

    test('SLACK_SUITE - Should NOT delete bot - Not found', async () => {
        await request(app)
            .delete('/slack/v1/deletebot?enterprise_id=&team_id=NOT_FOUND')
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send().expect(404);
    });

    test('SLACK_SUITE - Should NOT delete bot - Missing param', async () => {
        await request(app)
            .delete('/slack/v1/deletebot')
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send().expect(422);
    });

});