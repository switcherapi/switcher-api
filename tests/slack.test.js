import mongoose from 'mongoose';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import * as Controller from '../src/controller/slack';
import { mock1_slack_installation } from './fixtures/db_slack';
import { EnvType } from '../src/models/environment';
import Slack from '../src/models/slack';
import { 
    setupDatabase,
    adminMasterAccountToken,
    domainId
} from './fixtures/db_api';
import { TicketStatusType } from '../src/models/slack_ticket';

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

const buildInstallation = async (team_id, domain) => {
    const installation = Object.assign({}, mock1_slack_installation);
    installation.domain = domain;
    installation.team_id = team_id;
    installation.bot_payload.app_id = 'APP_ID';
    await Controller.createSlackInstallation(installation);
    return installation;
};

describe('Slack Installation', () => {
    beforeAll(setupDatabase);

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

    test('SLACK_SUITE - Should authorize installation', async () => {
        //given
        const installation = await buildInstallation('SHOULD_AUTHORIZE_DOMAIN', null);

        //test
        const response = await request(app)
            .post('/slack/v1/authorize')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                domain: domainId,
                team_id: installation.team_id
            }).expect(200);

        expect(response.body.domain).toBe(String(domainId));
    });

    test('SLACK_SUITE - Should NOT authorize installation - Invalid Domain Id', async () => {
        await request(app)
            .post('/slack/v1/authorize')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                domain: 'INVALID_DOMAIN',
                team_id: 'team_id'
            }).expect(422);
    });

    test('SLACK_SUITE - Should NOT authorize installation - Domain Id not found', async () => {
        await request(app)
            .post('/slack/v1/authorize')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                domain: new mongoose.Types.ObjectId(),
                team_id: 'team_id'
            }).expect(404);
    });

    test('SLACK_SUITE - Should NOT authorize installation - Team Id is missing', async () => {
        await request(app)
            .post('/slack/v1/authorize')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                domain: domainId
            }).expect(422);
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
            .delete(`/slack/v1/installation?enterprise_id=&team_id=${installation.team_id}`)
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send().expect(200);

        //check DB
        const slackDb = await Controller.getSlack(installation.enterprise_id, installation.team_id);
        expect(slackDb).toBe(null);
    });

    test('SLACK_SUITE - Should NOT delete installation - Not found', async () => {
        await request(app)
            .delete('/slack/v1/installation?enterprise_id=&team_id=NOT_FOUND')
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send().expect(404);
    });

    test('SLACK_SUITE - Should NOT delete installation - Missing param', async () => {
        await request(app)
            .delete('/slack/v1/installation')
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send().expect(422);
    });

});

describe('Slack Controller - Ticket', () => {
    beforeAll(setupDatabase);

    const ticket_fixture1 = {
        environment: EnvType.DEFAULT,
        group: 'Release 1',
        switcher: 'MY_FEATURE1',
        status: true,
        observations: 'Success'
    };

    test('SLACK_SUITE - Should authorize Domain', async () => {
        //given
        const installation = await buildInstallation('SHOULD_AUTHORIZE_DOMAIN', null);

        //test
        const slack = await Controller.authorizeSlackInstallation({
            domain: domainId,
            team_id: installation.team_id
        });

        expect(slack.domain).toBe(domainId);
    });

    test('SLACK_SUITE - Should NOT authorize Domain - Domain not found', async () => {
        //given
        const installation = await buildInstallation('SHOULD_AUTHORIZE_DOMAIN', null);

        //test
        const call = async () => {
            await Controller.authorizeSlackInstallation({
                domain: new mongoose.Types.ObjectId(),
                team_id: installation.team_id
            });
        }; 

        await expect(call()).rejects.toThrowError('Domain not found');
    });

    test('SLACK_SUITE - Should create a new Ticket', async () => {
        //given
        const installation = await buildInstallation('SHOULD_CREATE_TICKET', domainId);

        //test
        const slack = await Controller.createTicket(
            ticket_fixture1, null, installation.team_id);
        expect(slack.tickets[0]).toMatchObject(ticket_fixture1);
    });

    test('SLACK_SUITE - Should process a Ticket - Approved', async () => {
        //given
        const installation = await buildInstallation('SHOULD_PROCESS_TICKET_OK', domainId);
        let slack = await Controller.createTicket(
            ticket_fixture1, null, installation.team_id);

        //test
        slack = await Controller.processTicket(
            null, installation.team_id, slack.tickets[0].id, true);

        expect(slack.tickets[0].ticket_approvals).toEqual(1);
        expect(slack.tickets[0].ticket_status).toBe(TicketStatusType.APPROVED);
        expect(slack.tickets[0].date_closed).not.toBe(null);
    });

    test('SLACK_SUITE - Should process a Ticket - Denied', async () => {
        //given
        const installation = await buildInstallation('SHOULD_PROCESS_TICKET_NOK', domainId);
        let slack = await Controller.createTicket(
            ticket_fixture1, null, installation.team_id);

        //test
        slack = await Controller.processTicket(
            null, installation.team_id, slack.tickets[0].id, false);

        expect(slack.tickets[0].ticket_approvals).toEqual(0);
        expect(slack.tickets[0].ticket_status).toBe(TicketStatusType.DENIED);
        expect(slack.tickets[0].date_closed).not.toBe(null);
    });

    test('SLACK_SUITE - Should NOT process a Ticket - Domain not found', async () => {
        //given
        const installation = await buildInstallation(
            'SHOULD_NOT_PROCESS_TICKET_DOMAIN', new mongoose.Types.ObjectId());

        //test
        const call = async () => {
            await Controller.processTicket(
                null, installation.team_id, new mongoose.Types.ObjectId(), true);
        }; 

        await expect(call()).rejects.toThrowError('Domain not found');
    });

    test('SLACK_SUITE - Should NOT process a Ticket - Ticket not found', async () => {
        //given
        const installation = await buildInstallation('SHOULD_NOT_PROCESS_TICKET', domainId);

        //test
        const call = async () => {
            await Controller.processTicket(
                null, installation.team_id, new mongoose.Types.ObjectId(), true);
        }; 

        await expect(call()).rejects.toThrowError('Ticket not found');
    });
});