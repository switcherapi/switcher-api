import { Client } from 'switcher-client';
import mongoose from 'mongoose';
import request from 'supertest';
import jwt from 'jsonwebtoken';
import app from '../src/app';
import * as Services from '../src/services/slack';
import { getDomainById } from '../src/services/domain';
import { getConfig } from '../src/services/config';
import { EnvType } from '../src/models/environment';
import Domain from '../src/models/domain';
import { SlackTicket, TicketValidationType } from '../src/models/slack_ticket';
import Slack from '../src/models/slack';
import { mock1_slack_installation } from './fixtures/db_slack';
import { 
    setupDatabase,
    slack,
    adminMasterAccountToken,
    domainId,
    config1Document,
    groupConfigDocument,
    adminAccountToken,
    adminMasterAccountId
} from './fixtures/db_api';

afterAll(async () => {
    await Slack.deleteMany().exec();
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
    const installation = { ...mock1_slack_installation };
    installation.domain = domain;
    installation.team_id = team_id;
    installation.bot_payload.app_id = 'APP_ID';
    await Services.createSlackInstallation(installation);
    return installation;
};

const authorizeInstallation = async (installation, domainId, token) => {
    await request(app)
        .post('/slack/v1/authorize')
        .set('Authorization', `Bearer ${token}`)
        .send({
            domain: domainId,
            team_id: installation.team_id
        }).expect(200);
}

const createDomain = async (name) => {
    const _id = new mongoose.Types.ObjectId();
    const domainDocument = {
        _id,
        name,
        description: 'Test Domain for Slack Integration',
        activated: new Map().set(EnvType.DEFAULT, true),
        owner: adminMasterAccountId
    };

    await new Domain(domainDocument).save();
    return _id;
};

const createTicket = async (team_id) => {
    let ticket_content = {
        environment: EnvType.DEFAULT,
        group: groupConfigDocument.name,
        switcher: config1Document.key,
        status: false
    };

    const response = await request(app)
        .post('/slack/v1/ticket/create')
        .set('Authorization', `Bearer ${generateToken('30s')}`)
        .send({
            team_id,
            domain_id: domainId,
            ticket_content
        });

    return response.body;
};

describe('Slack Installation', () => {

    beforeAll(setupDatabase);

    test('SLACK_SUITE - Should generate token', async () => {
        const token = generateToken('30m');
        const decoded = jwt.verify(token, process.env.SWITCHER_SLACK_JWT_SECRET);
        expect(decoded.iss).toBe('Switcher Slack App');
        expect(decoded.sub).toBe('/resource');
    });

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
        const enterpriseSlack = { ...mock1_slack_installation };
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

    test('SLACK_SUITE - Should purge existing not authorized installation when new one is requested', async () => {
        //given
        const installation = await buildInstallation('EXISTING_NOT_AUTHORIZED_INSTALLATION', null);

        //test
        const response = await request(app)
            .post('/slack/v1/installation')
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send(installation).expect(201);

        expect(response.body.team_id).toBe(installation.team_id);
        expect(response.body.installation_payload).toMatchObject(
            installation.installation_payload);
        expect(response.body.bot_payload).toMatchObject(
            installation.bot_payload);

        //check DB
        const slackDb = await Slack.find({ team_id: installation.team_id });
        expect(slackDb.length).toBe(1);
    });

    test('SLACK_SUITE - Should NOT save installation - Slack unavailable', async () => {
        //given
        process.env.SWITCHER_API_ENABLE = true;
        Client.assume('SLACK_INTEGRATION').false();

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
        const slack_install = { ...mock1_slack_installation };
        delete slack_install.installation_payload;
        
        //test
        await request(app)
            .post('/slack/v1/installation')
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send(slack_install).expect(422);
    });

    test('SLACK_SUITE - Should authorize installation', async () => {
        //given
        const installation = await buildInstallation('T11NZ', null);

        //test
        const response = await request(app)
            .post('/slack/v1/authorize')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                domain: domainId,
                team_id: installation.team_id
            }).expect(200);

        expect(response.body.message).toBe('Authorization completed');

        //should not find linked/authorized installation
        await request(app)
            .get(`/slack/v1/installation/find?enterprise_id=&team_id=${installation.team_id}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(404);
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

    test('SLACK_SUITE - Should NOT query installation by Domain - Domain has no Slack integration', async () => {
        //given
        const domain = await getDomainById(domainId);
        const slackId = domain.integrations.slack;
        domain.integrations.slack = null;
        await domain.save();

        //test
        const response = await request(app)
            .get(`/slack/v1/installation/${String(domainId)}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(404);

        expect(response.body.error).toBe('Slack installation not found - no valid query provided');

        //teardown
        domain.integrations.slack = slackId;
        await domain.save();
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
        const installation = await buildInstallation('T01Y', null);

        //test
        await request(app)
            .post('/slack/v1/authorize')
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .send({
                domain: domainId,
                team_id: installation.team_id
            }).expect(403);
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
                team_id: 'T04Y'
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
        const installation = { ...mock1_slack_installation };
        installation.team_id = 'T14NZ';
        installation.bot_payload.app_id = 'TEST_FIND_BOT1';
        await Services.createSlackInstallation(installation);

        //test
        const response = await request(app)
            .get(`/slack/v1/findbot?enterprise_id=&team_id=${installation.team_id}`)
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send().expect(200);

        expect(response.body).toMatchObject(installation.bot_payload);
    });

    test('SLACK_SUITE - Should NOT find bot - Not found', async () => {
        await request(app)
            .get('/slack/v1/findbot?enterprise_id=&team_id=T15NZ')
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
        const installation = { ...mock1_slack_installation };
        installation.team_id = 'T13NZ';
        installation.installation_payload.app_id = 'TEST_FIND_INSTALLATION1';
        await Services.createSlackInstallation(installation);

        //test
        const response = await request(app)
            .get(`/slack/v1/findinstallation?enterprise_id=&team_id=${installation.team_id}`)
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send().expect(200);

        expect(response.body).toMatchObject(installation.installation_payload);
    });

    test('SLACK_SUITE - Should NOT find installation - Not found', async () => {
        await request(app)
            .get('/slack/v1/findinstallation?enterprise_id=&team_id=T12NZ')
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send().expect(404);
    });

    test('SLACK_SUITE - Should NOT find installation - Missing param', async () => {
        await request(app)
            .get('/slack/v1/findinstallation')
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send().expect(422);
    });

    test('SLACK_SUITE - Should find installation (Admin)', async () => {
        //given
        const installation = { ...mock1_slack_installation };
        installation.team_id = 'T10NZ';
        installation.installation_payload.app_id = 'TEST_FIND_INSTALLATION2';
        await Services.createSlackInstallation(installation);

        //test
        const response = await request(app)
            .get(`/slack/v1/installation/find?enterprise_id=&team_id=${installation.team_id}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        expect(response.body).toMatchObject(installation.installation_payload);
    });

    test('SLACK_SUITE - Should delete not authorized installation', async () => {
        //given
        const installation = { ...mock1_slack_installation };
        installation.team_id = 'T04NZ';
        installation.installation_payload.app_id = 'TEST_DELETE_INSTALLATION1';
        await Services.createSlackInstallation(installation);

        //test
        await request(app)
            .delete(`/slack/v1/installation?enterprise_id=&team_id=${installation.team_id}`)
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send().expect(200);

        //check DB
        const slackDb = await Services.getSlack({
            enterprise_id: installation.enterprise_id, 
            team_id: installation.team_id
        });
        expect(slackDb).toBe(null);
    });

    test('SLACK_SUITE - Should delete NOT authorized installation', async () => {
        //given
        const installation = await buildInstallation('T05NZ', null);

        //test
        await request(app)
            .delete(`/slack/v1/installation?team_id=${installation.team_id}`)
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send().expect(200);

        //check DB
        const slackDb = await Services.getSlack({ team_id: installation.team_id });
        expect(slackDb).toBe(null);
    });

    test('SLACK_SUITE - Should NOT delete installation - Not found', async () => {
        await request(app)
            .delete('/slack/v1/installation?enterprise_id=&team_id=T06NZ')
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
        const installation = await buildInstallation('T02Y', null);
        await authorizeInstallation(installation, domainId, adminMasterAccountToken);

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

        const slackDb = await Services.getSlack({ team_id: installation.team_id });
        expect(slackDb).toBe(null);
    });

    test('SLACK_SUITE - Should unlink single installation from Multi Slack Installation', async () => {
        //given - installation/authorization for Domain 1
        const installation = await buildInstallation('T03Y', null);
        await authorizeInstallation(installation, domainId, adminMasterAccountToken);

        //given - installation/authorization for Domain 2
        const domainId2 = await createDomain('Domain 2');
        const installation2 = await buildInstallation('T03Y', null);
        await request(app)
            .post('/slack/v1/authorize')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                domain: domainId2,
                team_id: installation2.team_id
            }).expect(200);

        //test - unlink installation for Domain 1 without affecting Domain 2
        await request(app)
            .delete(`/slack/v1/installation/unlink?domain=${String(domainId)}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        //check DB
        const domain = await getDomainById(domainId);
        expect(domain.integrations.slack).toBe(null);

        const domain2 = await getDomainById(domainId2);
        expect(domain2.integrations.slack).not.toBe(null);
    });

    test('SLACK_SUITE - Should NOT unlink installation - Admin is not owner', async () => {
        const response = await request(app)
            .delete(`/slack/v1/installation/unlink?domain=${String(domainId)}`)
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .send().expect(403);

        expect(response.body.error).toBe('Only the domain owner can unlink integrations');
    });

    test('SLACK_SUITE - Should NOT unlink installation - Domain Id not provided', async () => {
        await request(app)
            .delete('/slack/v1/installation/unlink')
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .send().expect(422);
    });

    test('SLACK_SUITE - Should decline installation', async () => {
        //given
        const installation = await buildInstallation('T09NZ', null);

        //test
        await request(app)
            .delete(`/slack/v1/installation/decline?team_id=${installation.team_id}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        const slackDb = await Services.getSlack({
            team_id: 'SHOULD_DECLINE_INTEGRATION'
        });
        expect(slackDb).toBe(null);
    });

    test('SLACK_SUITE - Should find Domains by Slack Team Id', async () => {
        //given
        const teamId = 'T01NZ';
        const domainId2 = await createDomain('Domain 2 (findByTeamId)');
        await buildInstallation(teamId, domainId2);

        const domainId3 = await createDomain('Domain 3 (findByTeamId)');
        await buildInstallation(teamId, domainId3);

        //test
        const response = await request(app)
            .get(`/slack/v1/domains?team_id=${teamId}`)
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send().expect(200);

        expect(response.body).toMatchObject([
            { id: String(domainId2), name: 'Domain 2 (findByTeamId)' },
            { id: String(domainId3), name: 'Domain 3 (findByTeamId)' }
        ]);
    });

    test('SLACK_SUITE - Should find only authorized Domains by Slack Team Id', async () => {
        //given
        const teamId = 'T02NZ';
        const domainId = await createDomain('Domain 4 (findByTeamId)');
        await buildInstallation(teamId, domainId); // authorized
        await buildInstallation(teamId); // not authorized

        //test
        const response = await request(app)
            .get(`/slack/v1/domains?team_id=${teamId}`)
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send().expect(200);

        expect(response.body).toMatchObject([
            { id: String(domainId), name: 'Domain 4 (findByTeamId)' }
        ]);
    });

    test('SLACK_SUITE - Should NOT find Domains by Slack Team Id - Missing param', async () => {
        await request(app)
            .get('/slack/v1/domains')
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send().expect(422);
    });

    test('SLACK_SUITE - Should NOT find Domains by Slack Team Id - Team Id not found', async () => {
        await request(app)
            .get('/slack/v1/domains?team_id=T03NZ')
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send().expect(404);
    });
});

describe('Slack Settings', () => {
    beforeAll(setupDatabase);

    test('SLACK_SUIT - Should update ignored environments', async () => {
        //given
        let slackDb = await Services.getSlack({ id: slack._id });
        expect(slackDb.settings.ignored_environments).toEqual(
            expect.arrayContaining(['dev']),
        );

        //test
        let response = await request(app)
            .patch(`/slack/v1/settings/${TicketValidationType.IGNORED_ENVIRONMENT}/${domainId}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                environments: ['dev', 'dev1']
            }).expect(200);

        slackDb = await Services.getSlack({ id: slack._id });
        expect(response.body).toEqual(slackDb.settings);
        expect(slackDb.settings.ignored_environments).toEqual(
            expect.arrayContaining(['dev', 'dev1']),
        );
    });

    test('SLACK_SUIT - Should update frozen environments', async () => {
        //given
        let slackDb = await Services.getSlack({ id: slack._id });
        expect(slackDb.settings.frozen_environments).toEqual(
            expect.arrayContaining(['staging']),
        );

        //test
        let response = await request(app)
            .patch(`/slack/v1/settings/${TicketValidationType.FROZEN_ENVIRONMENT}/${domainId}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                environments: ['staging', 'staging1']
            }).expect(200);

        slackDb = await Services.getSlack({ id: slack._id });
        expect(response.body).toEqual(slackDb.settings);
        expect(slackDb.settings.frozen_environments).toEqual(
            expect.arrayContaining(['staging', 'staging1']),
        );
    });

    test('SLACK_SUIT - Should NOT update settings - Invalid Domain Id', async () => {
        await request(app)
            .patch(`/slack/v1/settings/${TicketValidationType.IGNORED_ENVIRONMENT}/INVALID`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                environments: ['dev', 'dev1']
            }).expect(422);
    });

    test('SLACK_SUIT - Should NOT update settings - Slack Installation not found', async () => {
        await request(app)
            .patch(`/slack/v1/settings/${TicketValidationType.IGNORED_ENVIRONMENT}/${new mongoose.Types.ObjectId()}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                environments: ['dev', 'dev1']
            }).expect(404);
    });

    test('SLACK_SUIT - Should NOT update settings - Invalid Parameter', async () => {
        await request(app)
            .patch(`/slack/v1/settings/INVALID/${domainId}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                environments: ['dev', 'dev1']
            }).expect(400);
    });

});

describe('Slack Route - Create Ticket', () => {
    beforeAll(setupDatabase);

    test('SLACK_SUITE - Should create a ticket', async () => {
        //given
        const ticket_content = {
            environment: EnvType.DEFAULT,
            group: groupConfigDocument.name,
            switcher: config1Document.key,
            status: false,
            observations: 'Should create ticket'
        };

        //validate
        let response = await request(app)
            .post('/slack/v1/ticket/validate')
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send({
                team_id: slack.team_id,
                domain_id: domainId,
                ticket_content
            }).expect(200);

        expect(response.body).toMatchObject({
            message: 'Ticket validated',
            result: TicketValidationType.VALIDATED
        });

        //test - create
        response = await request(app)
            .post('/slack/v1/ticket/create')
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send({
                team_id: slack.team_id,
                domain_id: domainId,
                ticket_content
            }).expect(201);

        expect(response.body).toMatchObject({
            channel_id: slack.installation_payload.incoming_webhook_channel_id,
            channel: slack.installation_payload.incoming_webhook_channel,
            ticket: ticket_content
        });
    });

    test('SLACK_SUITE - Should NOT create a ticket - Environment Ignored', async () => {
        //given
        const ticket_content = {
            environment: 'dev',
            group: groupConfigDocument.name,
            switcher: config1Document.key,
            status: false
        };

        //validate
        let switcher = await getConfig({ key: config1Document.key, domain: slack.domain });
        expect(switcher.activated.get('dev')).toBe(undefined);

        const response = await request(app)
            .post('/slack/v1/ticket/validate')
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send({
                team_id: slack.team_id,
                domain_id: domainId,
                ticket_content
            }).expect(200);

        switcher = await getConfig({ key: config1Document.key, domain: slack.domain });
        expect(switcher.activated.get('dev')).toBe(false);
        expect(response.body).toMatchObject({
            message: 'Ticket validated',
            result: TicketValidationType.IGNORED_ENVIRONMENT
        });
    });

    test('SLACK_SUITE - Should NOT create a ticket - Environment frozen', async () => {
        //given
        const ticket_content = {
            environment: 'staging',
            group: groupConfigDocument.name,
            switcher: config1Document.key,
            status: false
        };

        //validate
        let switcher = await getConfig({ key: config1Document.key, domain: slack.domain });
        expect(switcher.activated.get('staging')).toBe(undefined);

        const response = await request(app)
            .post('/slack/v1/ticket/validate')
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send({
                team_id: slack.team_id,
                domain_id: domainId,
                ticket_content
            }).expect(200);

        switcher = await getConfig({ key: config1Document.key, domain: slack.domain });
        expect(switcher.activated.get('staging')).toBe(undefined);
        expect(response.body).toMatchObject({
            message: 'Ticket validated',
            result: TicketValidationType.FROZEN_ENVIRONMENT
        });
    });

    test('SLACK_SUITE - Should NOT create a ticket - Invalid', async () => {
        const ticket_content = {
            environment: EnvType.DEFAULT,
            group: groupConfigDocument.name,
            switcher: 'INVALID_SWITCHER_KEY',
            status: true
        };

        const response = await request(app)
            .post('/slack/v1/ticket/validate')
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send({
                team_id: slack.team_id,
                domain_id: domainId,
                ticket_content
            }).expect(404);
            
        expect(response.body.error).toBe('Switcher not found');
    });

    test('SLACK_SUITE - Should NOT create a ticket - Return existing one', async () => {
        const { ticket } = await createTicket(slack.team_id);

        const response = await request(app)
            .post('/slack/v1/ticket/create')
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send({
                team_id: slack.team_id,
                domain_id: domainId,
                ticket_content: {
                    environment: ticket.environment,
                    group: ticket.group,
                    switcher: ticket.switcher,
                    status: ticket.status,
                    observations: 'Should return existing ticket'
                }
            }).expect(201);
            
        expect(String(response.body.ticket._id)).toBe(String(ticket._id));
        expect(response.body.ticket.observations).not.toBe('Should return existing ticket');
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
                domain_id: domainId,
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
                domain_id: domainId,
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
                domain_id: domainId,
                ticket_content
            }).expect(404);
            
        expect(response.body.error).toBe('Environment not found');
    });

    test('SLACK_SUITE - Should NOT validate a ticket - Invalid Domain Id', async () => {
        const ticket_content = {
            environment: EnvType.DEFAULT,
            group: groupConfigDocument.name,
            switcher: config1Document.key,
            status: false
        };

        //test - invalid domain id
        await request(app)
            .post('/slack/v1/ticket/validate')
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send({
                team_id: slack.team_id,
                domain_id: 'INVALID',
                ticket_content
            }).expect(422);

        //test - domain not provided
        await request(app)
            .post('/slack/v1/ticket/validate')
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send({
                team_id: slack.team_id,
                ticket_content
            }).expect(422);

        //test - domain not found
        await request(app)
            .post('/slack/v1/ticket/validate')
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send({
                team_id: slack.team_id,
                domain_id: new mongoose.Types.ObjectId(),
                ticket_content
            }).expect(404);
    });

    test('SLACK_SUITE - Should NOT create a ticket - Invalid Domain Id', async () => {
        const ticket_content = {
            environment: EnvType.DEFAULT,
            group: groupConfigDocument.name,
            switcher: config1Document.key,
            status: false
        };

        //test - invalid domain id
        await request(app)
            .post('/slack/v1/ticket/create')
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send({
                team_id: slack.team_id,
                domain_id: 'INVALID',
                ticket_content
            }).expect(422);

        //test - domain not provided
        await request(app)
            .post('/slack/v1/ticket/create')
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send({
                team_id: slack.team_id,
                ticket_content
            }).expect(422);

        //test - domain not found
        await request(app)
            .post('/slack/v1/ticket/create')
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send({
                team_id: slack.team_id,
                domain_id: new mongoose.Types.ObjectId(),
                ticket_content
            }).expect(404);
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
                domain_id: domainId,
                ticket_content
            });

        return response.body;
    };

    test('SLACK_SUITE - Should approve a ticket - Switcher Change Request', async () => {
        //given
        const { ticket } = await createTicket();

        //verify that
        let ticketDb = await SlackTicket.findById(ticket._id).exec();
        expect(ticketDb).not.toBe(null);

        //test
        const response = await request(app)
            .post('/slack/v1/ticket/process')
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send({
                team_id: slack.team_id,
                domain_id: domainId,
                ticket_id: ticket._id,
                approved: true
            }).expect(200);

        expect(response.body.message).toBe(`Ticket ${ticket._id} processed`);

        //check DB
        ticketDb = await SlackTicket.findById(ticket._id).exec();
        expect(ticketDb).toBe(null);
    });

    test('SLACK_SUITE - Should approve a ticket - Group Change Request', async () => {
        //given
        const { ticket } = await createTicket(false);

        //test
        const response = await request(app)
            .post('/slack/v1/ticket/process')
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send({
                team_id: slack.team_id,
                domain_id: domainId,
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
                domain_id: domainId,
                ticket_id: new mongoose.Types.ObjectId(),
                approved: true
            }).expect(404);
    });

    test('SLACK_SUITE - Should NOT process a ticket - Invalid Domain Id', async () => {
        const { ticket } = await createTicket();

        //test - invalid domain id
        await request(app)
            .post('/slack/v1/ticket/process')
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send({
                team_id: slack.team_id,
                domain_id: 'INVALID',
                ticket_id: ticket._id,
                approved: true
            }).expect(422);

        //test - domain not provided
        await request(app)
            .post('/slack/v1/ticket/process')
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send({
                team_id: slack.team_id,
                ticket_id: ticket._id,
                approved: true
            }).expect(422);

        //test - domain not found
        await request(app)
            .post('/slack/v1/ticket/process')
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send({
                team_id: slack.team_id,
                domain_id: new mongoose.Types.ObjectId(),
                ticket_id: ticket._id,
                approved: true
            }).expect(404);
    });

    test('SLACK_SUITE - Should NOT process a ticket - Installation not found', async () => {
        await request(app)
            .post('/slack/v1/ticket/process')
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send({
                team_id: 'N0000NZ',
                domain_id: domainId,
                ticket_id: new mongoose.Types.ObjectId(),
                approved: true
            }).expect(404);
    });

    test('SLACK_SUITE - Should deny a ticket', async () => {
        //given
        const { ticket } = await createTicket();

        //verify that
        let ticketDb = await SlackTicket.findById(ticket._id).exec();
        expect(ticketDb).not.toBe(null);

        //test
        const response = await request(app)
            .post('/slack/v1/ticket/process')
            .set('Authorization', `Bearer ${generateToken('30s')}`)
            .send({
                team_id: slack.team_id,
                domain_id: domainId,
                ticket_id: ticket._id,
                approved: false
            }).expect(200);

        expect(response.body.message).toBe(`Ticket ${ticket._id} processed`);

        //check DB
        ticketDb = await SlackTicket.findById(ticket._id).exec();
        expect(ticketDb).toBe(null);
    });

    test('SLACK_SUITE - Should reset installation tickets', async () => {
        //given
        await createTicket();

        //verify that
        let slackTickets = await SlackTicket.find({ slack: slack._id }).exec();
        expect(slackTickets.length).toBeGreaterThan(0);

        //test
        await request(app)
            .post('/slack/v1/ticket/clear')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                team_id: slack.team_id,
                domain_id: domainId
            }).expect(200);

        slackTickets = await SlackTicket.find({ slack: slack._id }).exec();
        expect(slackTickets.length).toEqual(0);
    });

    test('SLACK_SUITE - Should NOT reset installation tickets - Admin not owner', async () => {
        await request(app)
            .post('/slack/v1/ticket/clear')
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .send({
                team_id: slack.team_id,
                domain_id: domainId
            }).expect(403);
    });

    test('SLACK_SUITE - Should NOT reset installation tickets - Invalid Domain Id', async () => {
        //test - invalid domain id
        await request(app)
            .post('/slack/v1/ticket/clear')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                team_id: slack.team_id,
                domain_id: 'INVALID'
            }).expect(422);

        //test - domain not provided
        await request(app)
            .post('/slack/v1/ticket/clear')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                team_id: slack.team_id
            }).expect(422);

        //test - domain not found
        await request(app)
            .post('/slack/v1/ticket/clear')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                team_id: slack.team_id,
                domain_id: new mongoose.Types.ObjectId()
            }).expect(404);
    });

});