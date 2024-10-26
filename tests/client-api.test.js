import mongoose from 'mongoose';
import request from 'supertest';
import sinon from 'sinon';
import app from '../src/app';
import { ActionTypes, Permission, RouterTypes } from '../src/models/permission';
import { permissionCache } from '../src/helpers/cache';
import { Team } from '../src/models/team';
import { EnvType } from '../src/models/environment';
import Admin from '../src/models/admin';
import * as graphqlUtils from './graphql-utils';
import { 
    setupDatabase,
    adminMasterAccountToken,
    adminAccountToken,
    keyConfig,
    configId,
    groupConfigId,
    domainId,
    adminAccountId,
    slack,
    keyConfigPrdQA
} from './fixtures/db_client';

const setPermissionsToTeam = async (teamId, permission, reset) => {
    const permissionId = new mongoose.Types.ObjectId();
    permission._id = permissionId;

    await new Permission(permission).save();
    const team = await Team.findById(teamId).exec();

    if (reset) {
        team.permissions = [];
    }

    team.permissions.push(permissionId);
    await team.save();
};

beforeAll(setupDatabase);

afterAll(async () => { 
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mongoose.disconnect();
});

describe('Testing domain', () => {

    afterAll(setupDatabase);

    test('CLIENT_SUITE - Should return the Domain structure', async () => {
        const req = await request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(graphqlUtils.domainQuery([['_id', domainId]], true, true, true));
        
        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).toMatchObject(JSON.parse(graphqlUtils.expected102));
    });

    test('CLIENT_SUITE - Should return 2 switchers when NOT filtered by Component', async () => {
        const req = await request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(graphqlUtils.domainQuery([
                ['_id', domainId],
                ['environment', EnvType.DEFAULT]])
            );
        
        const result = JSON.parse(req.text);
        expect(req.statusCode).toBe(200);
        expect(result.data.domain.group[0].config.length).toBe(2);
    });

    test('CLIENT_SUITE - Should return 1 switcher when filtered by Component', async () => {
        const req = await request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(graphqlUtils.domainQuery([
                ['_id', domainId],
                ['environment', EnvType.DEFAULT],
                ['_component', 'TestApp']])
            );

        const result = JSON.parse(req.text);
        expect(req.statusCode).toBe(200);
        expect(result.data.domain.group[0].config.length).toBe(1);
    });

    test('CLIENT_SUITE - Should return the Domain structure - Disabling strategies (resolver test)', async () => {
        const req = await request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(graphqlUtils.domainQuery([['_id', domainId]], true, true, false));
    
        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).toMatchObject(JSON.parse(graphqlUtils.expected103));
    });

    test('CLIENT_SUITE - Should return the Domain structure - Disabling group config (resolver test)', async () => {
        const req = await request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(graphqlUtils.domainQuery([['_id', domainId]], false, false, false));
         
        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).toMatchObject(JSON.parse(graphqlUtils.expected104));
    });

    test('CLIENT_SUITE - Should return the Domain structure - Disabling config (resolver test)', async () => {
        const req = await request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(graphqlUtils.domainQuery([['_id', domainId]], true, false, false));

        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).toMatchObject(JSON.parse(graphqlUtils.expected105(keyConfigPrdQA)));
    });
});

describe('Testing domain [Adm-GraphQL] ', () => {

    afterAll(setupDatabase);

    test('CLIENT_SUITE - Should return domain structure', async () => {
        const req = await request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(graphqlUtils.domainQuery([['name', 'Domain']]));

        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).toMatchObject(JSON.parse(graphqlUtils.expected106));
    });

    test('CLIENT_SUITE - Should NOT return domain structure - Filtered by disabled Domain', async () => {
        const req = await request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(graphqlUtils.domainQuery([
                ['name', 'Domain'],
                ['activated', false]]));

        const expected = '{"data":{"domain":null}}';
        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).toMatchObject(JSON.parse(expected));
    });

    test('CLIENT_SUITE - Should return domain structure for a team member', async () => {
        const req = await request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .send(graphqlUtils.domainQuery([['_id', domainId], ['environment', EnvType.DEFAULT]]));

        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).toMatchObject(JSON.parse(graphqlUtils.expected107));
    });

    test('CLIENT_SUITE - Should NOT return domain structure - Missing query params', async () => {
        const req = await request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .send(graphqlUtils.domainQuery([['environment', EnvType.DEFAULT]]));

        const expected = '{"data":{"domain":null}}';
        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).toMatchObject(JSON.parse(expected));
    });

    test('CLIENT_SUITE - Should return domain Flat-structure - By Switcher Key', async () => {
        const req = await request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(graphqlUtils.configurationQuery([['domain', domainId], ['key', keyConfig]]));

        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).toMatchObject(JSON.parse(graphqlUtils.expected108));
    });

    test('CLIENT_SUITE - Should return domain Flat-structure - By Switcher Id', async () => {
        const req = await request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(graphqlUtils.configurationQuery([['domain', domainId], ['config_id', configId]]));

        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).toMatchObject(JSON.parse(graphqlUtils.expected108));
    });

    test('CLIENT_SUITE - Should return partial domain Flat-structure - By NOT_FOUND Switcher Key', async () => {
        const req = await request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(graphqlUtils.configurationQuery([['domain', domainId], ['key', 'NOT_FAUND']]));

        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).toMatchObject(JSON.parse(graphqlUtils.expected112));
    });

    test('CLIENT_SUITE - Should return domain Flat-structure - By Group', async () => {
        const req = await request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(graphqlUtils.configurationQuery([['domain', domainId], ['group', 'Group Test']]));

        const result = JSON.parse(req.text);
        expect(req.statusCode).toBe(200);
        expect(result.data.configuration.group[0].name).toEqual('Group Test');
    });

    test('CLIENT_SUITE - Should return domain Flat-structure - By Group Id', async () => {
        const req = await request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(graphqlUtils.configurationQuery([['domain', domainId], ['group_id', groupConfigId]]));

        const result = JSON.parse(req.text);
        expect(req.statusCode).toBe(200);
        expect(result.data.configuration.group[0].name).toEqual('Group Test');
    });

    test('CLIENT_SUITE - Should return partial domain Flat-structure - By NOT_FOUND Group', async () => {
        const req = await request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(graphqlUtils.configurationQuery([['domain', domainId], ['group', 'NOT_FOUND']]));
        
        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).toMatchObject(JSON.parse(graphqlUtils.expected112));
    });

    test('CLIENT_SUITE - Should return domain Flat-structure for a team member', async () => {
        const req = await request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .send(graphqlUtils.configurationQuery([
                ['domain', domainId], 
                ['key', keyConfig], 
                ['environment', EnvType.DEFAULT]]));

        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).toMatchObject(JSON.parse(graphqlUtils.expected109));
    });

    test('CLIENT_SUITE - Should return domain Flat-structure - By domain',  async () => {
        const req = await request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .send(graphqlUtils.configurationQuery([
                ['domain', domainId]]));

        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).toMatchObject(JSON.parse(graphqlUtils.expected110));
    });

    test('CLIENT_SUITE - Should return environments Flat-structure - By Slack Team ID and Domain ID', async () => {
        const req = await request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .send(graphqlUtils.configurationQuery([
                ['slack_team_id', slack.team_id],
                ['domain', domainId]], false, false, false, false, true));
                
        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).toMatchObject(JSON.parse(graphqlUtils.expected111));
    });
});

describe('Testing domain [Adm-GraphQL] - Permission', () => {

    afterAll(setupDatabase);

    test('CLIENT_SUITE - Should return list of Groups permissions', async () => {
        const req = await request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(graphqlUtils.permissionsQuery(domainId, undefined, '"UPDATE","DELETE"', RouterTypes.GROUP));

        const exptected = '[{"action":"UPDATE","result":"ok"},{"action":"DELETE","result":"ok"}]';
        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).not.toBe(null);
        expect(JSON.parse(req.text).data.permission[0].name).toBe('Group Test');
        expect(JSON.parse(req.text).data.permission[0].permissions).toMatchObject(JSON.parse(exptected));
    });

    test('CLIENT_SUITE - Should return list of Groups permissions - from cache', async () => {
        const cacheSpy = sinon.spy(permissionCache, 'get');
        permissionCache.permissionReset(domainId, ActionTypes.UPDATE, RouterTypes.GROUP);

        await request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(graphqlUtils.permissionsQuery(domainId, undefined, '"UPDATE","DELETE"', RouterTypes.GROUP));

        expect(cacheSpy.callCount).toBe(0);
        
        const req = await request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(graphqlUtils.permissionsQuery(domainId, undefined, '"UPDATE","DELETE"', RouterTypes.GROUP));

        const exptected = '[{"action":"UPDATE","result":"ok"},{"action":"DELETE","result":"ok"}]';
        expect(req.statusCode).toBe(200);
        expect(cacheSpy.callCount).toBe(1);
        expect(JSON.parse(req.text)).not.toBe(null);
        expect(JSON.parse(req.text).data.permission[0].name).toBe('Group Test');
        expect(JSON.parse(req.text).data.permission[0].permissions).toMatchObject(JSON.parse(exptected));
    });

    test('CLIENT_SUITE - Should return list of Groups permissions - by environment', async () => {
        const req = await request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .send(graphqlUtils.permissionsQuery(domainId, undefined, '"CREATE"', RouterTypes.GROUP, EnvType.DEFAULT));
        
        const exptected = '[{"action":"CREATE","result":"ok"}]';
        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).not.toBe(null);
        expect(JSON.parse(req.text).data.permission[0].name).toBe('Group Test');
        expect(JSON.parse(req.text).data.permission[0].permissions).toMatchObject(JSON.parse(exptected));
    });

    test('CLIENT_SUITE - Should return list of Groups permissions - Unauthorized access', async () => {
        const req = await request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .send(graphqlUtils.permissionsQuery(domainId, undefined, '"UPDATE","DELETE"', RouterTypes.GROUP));

        const exptected = '[{"action":"UPDATE","result":"nok"},{"action":"DELETE","result":"nok"}]';
        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).not.toBe(null);
        expect(JSON.parse(req.text).data.permission[0].name).toBe('Group Test');
        expect(JSON.parse(req.text).data.permission[0].permissions).toMatchObject(JSON.parse(exptected));
    });

    test('CLIENT_SUITE - Should return list of Configs permissions', async () => {
        const req = await request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send(graphqlUtils.permissionsQuery(domainId, groupConfigId, '"UPDATE","DELETE"', RouterTypes.CONFIG));

        const exptected = '[{"action":"UPDATE","result":"ok"},{"action":"DELETE","result":"ok"}]';
        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).not.toBe(null);
        expect(JSON.parse(req.text).data.permission[0].name).toBe('TEST_CONFIG_KEY');
        expect(JSON.parse(req.text).data.permission[1].name).toBe('TEST_CONFIG_KEY_PRD_QA');
        expect(JSON.parse(req.text).data.permission[0].permissions).toMatchObject(JSON.parse(exptected));
        expect(JSON.parse(req.text).data.permission[1].permissions).toMatchObject(JSON.parse(exptected));
    });

    test('CLIENT_SUITE - Should return list of Configs permissions - Unauthorized access', async () => {
        const req = await request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .send(graphqlUtils.permissionsQuery(domainId, groupConfigId, '"UPDATE","DELETE"', RouterTypes.CONFIG));

        const exptected = '[{"action":"UPDATE","result":"nok"},{"action":"DELETE","result":"nok"}]';
        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).not.toBe(null);
        expect(JSON.parse(req.text).data.permission[0].name).toBe('TEST_CONFIG_KEY');
        expect(JSON.parse(req.text).data.permission[1].name).toBe('TEST_CONFIG_KEY_PRD_QA');
        expect(JSON.parse(req.text).data.permission[0].permissions).toMatchObject(JSON.parse(exptected));
        expect(JSON.parse(req.text).data.permission[1].permissions).toMatchObject(JSON.parse(exptected));
    });

    test('CLIENT_SUITE - Should NOT return list of permissions - Invalid router', async () => {
        const req = await request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .send(graphqlUtils.permissionsQuery(domainId, undefined, '"UPDATE","DELETE"', RouterTypes.DOMAIN));

        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).not.toBe(null);
        expect(JSON.parse(req.text).data.permission).toStrictEqual([]);
    });

    test('CLIENT_SUITE - Should return domain partial structure based on permission', async () => {
        // Given
        const admin = await Admin.findById(adminAccountId).exec();
        await setPermissionsToTeam(admin.teams[0], {
            action: ActionTypes.READ,
            active: true,
            identifiedBy: 'key',
            values: ['TEST_CONFIG_KEY_PRD_QA'],
            router: RouterTypes.CONFIG
        }, true);

        // Test
        const req = await request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .send(graphqlUtils.domainQuery([['_id', domainId], ['environment', EnvType.DEFAULT]]));

        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).toMatchObject(JSON.parse(graphqlUtils.expected1071));
    });

    test('CLIENT_SUITE - Should NOT return complete domain structure - no valid Config permission', async () => {
        // Given
        const admin = await Admin.findById(adminAccountId).exec();
        await setPermissionsToTeam(admin.teams[0], {
            action: ActionTypes.READ,
            active: true,
            router: RouterTypes.GROUP
        }, true);

        // Test
        const req = await request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .send(graphqlUtils.domainQuery([['_id', domainId], ['environment', EnvType.DEFAULT]]));
        
        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).toMatchObject(JSON.parse(graphqlUtils.expected1072));
    });

    test('CLIENT_SUITE - Should NOT return complete domain structure - no valid Group permission', async () => {
        // Given
        const admin = await Admin.findById(adminAccountId).exec();
        await setPermissionsToTeam(admin.teams[0], {
            action: ActionTypes.READ,
            active: true,
            router: RouterTypes.DOMAIN
        }, true);

        // Test
        const req = await request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .send(graphqlUtils.domainQuery([['_id', domainId], ['environment', EnvType.DEFAULT]]));
        
        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).toMatchObject(JSON.parse(graphqlUtils.expected1073));
    });
});

describe('Testing domain/configuration [Adm-GraphQL] - Excluded team member ', () => {

    afterAll(setupDatabase);

    test('CLIENT_SUITE - Should NOT return domain structure for an excluded team member', async () => {
        // Given
        const admin = await Admin.findById(adminAccountId).exec();
        admin.teams = [];
        await admin.save();
        
        const req = await request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .send(graphqlUtils.domainQuery([['_id', domainId], ['environment', EnvType.DEFAULT]]));

        const expected = '{"data":{"domain":null}}';
        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).toMatchObject(JSON.parse(expected));
    });

    test('CLIENT_SUITE - Should NOT return domain Flat-structure for an excluded team member', async () => {
        const req = await request(app)
            .post('/adm-graphql')
            .set('Authorization', `Bearer ${adminAccountToken}`)
            .send(graphqlUtils.configurationQuery([
                ['domain', domainId], 
                ['key', keyConfig], 
                ['environment', EnvType.DEFAULT]]));

        const expected = '{"data":{"configuration":{"domain":null,"group":null,"config":null,"strategies":null}}}';
        expect(req.statusCode).toBe(200);
        expect(JSON.parse(req.text)).toMatchObject(JSON.parse(expected));
    });
    
});