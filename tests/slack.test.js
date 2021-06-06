import { Switcher } from 'switcher-client';
import mongoose from 'mongoose';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import * as Controller from '../src/controller/slack';
import { getDomainById } from '../src/controller/domain';
import { mock1_slack_installation } from './fixtures/db_slack';
import { EnvType } from '../src/models/environment';
import Slack from '../src/models/slack';
import { 
    setupDatabase,
    slack,
    adminMasterAccountToken,
    domainId,
    config1Document,
    groupConfigDocument,
    adminAccountToken
} from './fixtures/db_api';

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

describe('Slack Feature Availability', () => {
    beforeAll(async () => {
        await setupDatabase();
        process.env.SWITCHER_API_ENABLE = true;
        process.env.SWITCHER_API_LOGGER = true;
    });

    afterAll(() => {
        process.env.SWITCHER_API_ENABLE = false;
        process.env.SWITCHER_API_LOGGER = false;
    });

    test('SLACK_SUITE - Should check feature - Available', async () => {
        Switcher.assume('SLACK_INTEGRATION').true();
        const response = await request(app)
            .post('/slack/v1/availability')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                feature: 'SLACK_INTEGRATION'
            }).expect(200);

        expect(response.body.result).toBe(true);
    });

    test('SLACK_SUITE - Should check feature - Available', async () => {
        Switcher.assume('SLACK_INTEGRATION').false();
        const response = await request(app)
            .post('/slack/v1/availability')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                feature: 'SLACK_INTEGRATION'
            }).expect(200);

        expect(response.body.result).toBe(false);
    });

    test('SLACK_SUITE - Should check - Not available', async () => {
        await request(app)
            .post('/slack/v1/availability')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                feature: 'INVALID_FEATURE_KEY'
            }).expect(400);
    });
});

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

    test('SLACK_SUITE - Should NOT save installation - Slack unavailable', async () => {
        //given
        process.env.SWITCHER_API_ENABLE = true;
        Switcher.assume('SLACK_INTEGRATION').false();

        //test
        const response = await request(app)
            .post('/slack/v1/installation')
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send(mock1_slack_installation).expect(400);

        expect(response.body.error).toBe('Slack Integration is not available.');

        //teardown
        process.env.SWITCHER_API_ENABLE = false;
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

        expect(response.body.message).toBe('Authorization completed');
    });

    test('SLACK_SUITE - Should query installation by Domain', async () => {
        const response = await request(app)
            .get(`/slack/v1/installation/${String(domainId)}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        expect(response.body.team_name).toBe(
            mock1_slack_installation.installation_payload.team_name);
        expect(response.body.channel).toBe(
            mock1_slack_installation.installation_payload.incoming_webhook_channel);
    });

    test('SLACK_SUITE - Should NOT query installation by Domain - Domain not found', async () => {
        await request(app)
            .get(`/slack/v1/installation/${new mongoose.Types.ObjectId()}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(404);
    });

    test('SLACK_SUITE - Should NOT query installation by Domain - Invalid Domain', async () => {
        await request(app)
            .get('/slack/v1/installation/INVALID')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(422);
    });

    test('SLACK_SUITE - Should NOT authorize installation - Admin is not owner', async () => {
        //given
        const installation = await buildInstallation('SHOULD_NOT_AUTHORIZE_DOMAIN', null);

        //test
        await request(app)
            .post('/slack/v1/authorize')
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .send({
                domain: domainId,
                team_id: installation.team_id
            }).expect(401);
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

    test('SLACK_SUITE - Should delete not authorized installation', async () => {
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
        const slackDb = await Controller.getSlack({
            enterprise_id: installation.enterprise_id, 
            team_id: installation.team_id
        });
        expect(slackDb).toBe(null);
    });

    test('SLACK_SUITE - Should delete authorized installation', async () => {
        //verify that
        let domain = await getDomainById(domainId);
        expect(domain.integrations.slack).not.toBe(null);

        //test
        await request(app)
            .delete('/slack/v1/installation?team_id=SHOULD_AUTHORIZE_DOMAIN')
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send().expect(200);

        //check DB
        domain = await getDomainById(domainId);
        expect(domain.integrations.slack).toBe(null);

        const slackDb = await Controller.getSlack({
            team_id: 'SHOULD_AUTHORIZE_DOMAIN'
        });
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

    test('SLACK_SUITE - Should unlink installation', async () => {
        //given
        const installation = await buildInstallation('SHOULD_UNLINK_INTEGRATION', null);
        await request(app)
            .post('/slack/v1/authorize')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                domain: domainId,
                team_id: installation.team_id
            }).expect(200);

        //verify that
        let domain = await getDomainById(domainId);
        expect(domain.integrations.slack).not.toBe(null);

        //test
        await request(app)
            .delete(`/slack/v1/installation/unlink?domain=${String(domainId)}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        //check DB
        domain = await getDomainById(domainId);
        expect(domain.integrations.slack).toBe(null);

        const slackDb = await Controller.getSlack({
            team_id: 'SHOULD_UNLINK_INTEGRATION'
        });
        expect(slackDb).toBe(null);
    });

    test('SLACK_SUITE - Should NOT unlink installation - Admin is not owner', async () => {
        const response = await request(app)
            .delete(`/slack/v1/installation/unlink?domain=${String(domainId)}`)
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .send().expect(401);

        expect(response.body.error).toBe('Only the domain owner can unlink integrations');
    });

    test('SLACK_SUITE - Should NOT unlink installation - Domain Id not provided', async () => {
        await request(app)
            .delete('/slack/v1/installation/unlink')
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .send().expect(422);
    });
});

describe('Slack Route - Create Ticket', () => {
    beforeAll(setupDatabase);

    test('SLACK_SUITE - Should create a ticket', async () => {
        const ticket_content = {
            environment: EnvType.DEFAULT,
            group: groupConfigDocument.name,
            switcher: config1Document.key,
            status: false,
            observations: 'Should create ticket'
        };

        const response = await request(app)
            .post('/slack/v1/ticket/create')
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send({
                team_id: slack.team_id,
                ticket_content
            }).expect(201);

        expect(response.body).toMatchObject(ticket_content);
    });

    test('SLACK_SUITE - Should NOT create a ticket - Already opened', async () => {
        const ticket_content = {
            environment: EnvType.DEFAULT,
            group: groupConfigDocument.name,
            switcher: config1Document.key,
            status: false,
            observations: 'Should create ticket'
        };

        const response = await request(app)
            .post('/slack/v1/ticket/create')
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send({
                team_id: slack.team_id,
                ticket_content
            }).expect(400);
            
        expect(response.body.error).toBe('Ticket already opened');
    });

    test('SLACK_SUITE - Should NOT create a ticket - Group not found', async () => {
        const ticket_content = {
            environment: EnvType.DEFAULT,
            group: 'NOT_FOUND',
            switcher: config1Document.key,
            status: false
        };

        const response = await request(app)
            .post('/slack/v1/ticket/create')
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send({
                team_id: slack.team_id,
                ticket_content
            }).expect(404);
            
        expect(response.body.error).toBe('Group not found');
    });

    test('SLACK_SUITE - Should NOT create a ticket - Group not found', async () => {
        const ticket_content = {
            environment: EnvType.DEFAULT,
            group: groupConfigDocument.name,
            switcher: 'NOT_FOUND',
            status: false
        };

        const response = await request(app)
            .post('/slack/v1/ticket/create')
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send({
                team_id: slack.team_id,
                ticket_content
            }).expect(404);
            
        expect(response.body.error).toBe('Switcher not found');
    });

    test('SLACK_SUITE - Should NOT create a ticket - Environment not found', async () => {
        const ticket_content = {
            environment: 'NOT_FOUND',
            group: groupConfigDocument.name,
            switcher: config1Document.key,
            status: false
        };

        const response = await request(app)
            .post('/slack/v1/ticket/create')
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send({
                team_id: slack.team_id,
                ticket_content
            }).expect(404);
            
        expect(response.body.error).toBe('Environment not found');
    });
});

describe('Slack Route - Process Ticket', () => {
    beforeAll(setupDatabase);

    const createTicket = async (add_switcher = true) => {
        let ticket_content = {
            environment: EnvType.DEFAULT,
            group: groupConfigDocument.name,
            status: false,
            observations: 'Should create ticket'
        };

        if (add_switcher)
            ticket_content.switcher = config1Document.key;

        const response = await request(app)
            .post('/slack/v1/ticket/create')
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send({
                team_id: slack.team_id,
                ticket_content
            });

        return response.body;
    };

    test('SLACK_SUITE - Should approve a ticket - Switcher Change Request', async () => {
        //given
        const ticket = await createTicket();

        //test
        const response = await request(app)
            .post('/slack/v1/ticket/process')
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send({
                team_id: slack.team_id,
                ticket_id: ticket._id,
                approved: true
            }).expect(200);

        expect(response.body.message).toBe(`Ticket ${ticket._id} processed`);
    });

    test('SLACK_SUITE - Should approve a ticket - Group Change Request', async () => {
        //given
        const ticket = await createTicket(false);

        //test
        const response = await request(app)
            .post('/slack/v1/ticket/process')
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send({
                team_id: slack.team_id,
                ticket_id: ticket._id,
                approved: true
            });

        expect(response.body.message).toBe(`Ticket ${ticket._id} processed`);
    });

    test('SLACK_SUITE - Should NOT process a ticket - Ticket not found', async () => {
        await request(app)
            .post('/slack/v1/ticket/process')
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send({
                team_id: slack.team_id,
                ticket_id: new mongoose.Types.ObjectId(),
                approved: true
            }).expect(404);
    });

    test('SLACK_SUITE - Should NOT process a ticket - Installation not found', async () => {
        await request(app)
            .post('/slack/v1/ticket/process')
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send({
                team_id: 'NOT_FOUND',
                ticket_id: new mongoose.Types.ObjectId(),
                approved: true
            }).expect(404);
    });

    test('SLACK_SUITE - Should deny a ticket', async () => {
        //given
        const ticket = await createTicket();

        //test
        const response = await request(app)
            .post('/slack/v1/ticket/process')
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send({
                team_id: slack.team_id,
                ticket_id: ticket._id,
                approved: false
            }).expect(200);

        expect(response.body.message).toBe(`Ticket ${ticket._id} processed`);
    });

    test('SLACK_SUITE - Should reset installation tickets', async () => {
        //verify that
        let slackInstallation = await Slack.findOne({ team_id: slack.team_id });
        expect(slackInstallation.tickets.length).toBeGreaterThan(0);

        //test
        await request(app)
            .post('/slack/v1/ticket/clear')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                team_id: slack.team_id
            }).expect(200);

        slackInstallation = await Slack.findOne({ team_id: slack.team_id });
        expect(slackInstallation.tickets.length).toEqual(0);
    });

    test('SLACK_SUITE - Should NOT reset installation tickets - Admin not owner', async () => {
        await request(app)
            .post('/slack/v1/ticket/clear')
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .send({
                team_id: slack.team_id
            }).expect(401);
    });

});