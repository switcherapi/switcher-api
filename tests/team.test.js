import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app';
import { Team } from '../src/models/team';
import TeamInvite from '../src/models/team-invite';
import Admin from '../src/models/admin';
import { 
    setupDatabase,
    adminMasterAccountToken,
    domainId,
    domainDocument,
    team1Id,
    adminAccountId,
    role1Id,
    team1,
    adminMasterAccountId,
    adminMasterAccount,
    teamInviteNoTeam
 } from './fixtures/db_api';

afterAll(async () => { 
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mongoose.disconnect();
});

describe('Insertion tests', () => {
    beforeAll(setupDatabase);

    test('TEAM_SUITE - Should create a new Team', async () => {
        const response = await request(app)
            .post('/team/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'My Team',
                domain: domainId
            }).expect(201);

        // DB validation - document created
        const team = await Team.findById(response.body._id).lean();
        expect(team).not.toBeNull();

        // Response validation
        expect(response.body.name).toBe('My Team');

        //Should NOT create team with same name
        await request(app)
            .post('/team/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'My Team',
                domain: domainId
            }).expect(400);
    });

    test('TEAM_SUITE - Should create a new Team - With default read and create permission', async () => {
        const response = await request(app)
            .post('/team/create/?defaultActions=READ,CREATE')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'My Team 2',
                domain: domainId
            }).expect(201);

        // DB validation - document created
        const team = await Team.findById(response.body._id).lean();
        expect(team).not.toBeNull();
        expect(team.roles.length).toEqual(2);
    });

    test('TEAM_SUITE - Should NOT create a new Team - Invalid action permission', async () => {
        const response = await request(app)
            .post('/team/create/?defaultActions=INVALID_ACTION')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'My Team 2',
                domain: domainId
            }).expect(400);

        expect(response.body.error).toEqual('Role validation failed: action: \'INVALID_ACTION\' is not a valid enum value.');
    });

    test('TEAM_SUITE - Should NOT create a new Team - Domain not found', async () => {
        await request(app)
            .post('/team/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'My Team',
                domain: new mongoose.Types.ObjectId()
            }).expect(404);
    });

    test('TEAM_SUITE - Should NOT create a new Team - Invalid domain Id', async () => {
        await request(app)
            .post('/team/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'My Team',
                domain: 'INVALID_ID'
            }).expect(404);
    });

    test('TEAM_SUITE - Should NOT create a new Team - Name is missing', async () => {
        await request(app)
            .post('/team/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                domain: domainId
            }).expect(422);
    });
});

describe('Reading tests', () => {

    let teamId;

    beforeAll(async () => {
        const response = await request(app)
            .post('/team/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'My Team - Reading Tests',
                domain: domainId
            }).expect(201);

        teamId = response.body._id;
    });

    test('TEAM_SUITE - Should read all Teams from a Domain', async () => {
        const response = await request(app)
            .get('/team?domain=' + domainId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        const teamFound = response.body.map(team => team.name);
        expect(teamFound.includes('My Team - Reading Tests')).toEqual(true);
    });

    test('TEAM_SUITE - Should NOT read all Teams from a Domain - Invalid domain Id', async () => {
        await request(app)
            .get('/team?domain=INVALID_ID')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(400);
    });

    test('TEAM_SUITE - Should read one single Team', async () => {
        const response = await request(app)
            .get('/team/' + teamId + '?resolveMembers=true')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        expect(response.body.name).toBe('My Team - Reading Tests');
    });

    test('TEAM_SUITE - Should NOT read Team - Not found', async () => {
        await request(app)
            .get('/team/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(404);
    });

    test('TEAM_SUITE - Should NOT read Team - Invalid Id', async () => {
        await request(app)
            .get('/team/INVALID_ID')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(400);
    });

    test('TEAM_SUITE - Should NOT read Team - Domain Id not provided', async () => {
        await request(app)
            .get('/team')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(500);
    });
});

describe('Updating tests', () => {
    beforeAll(setupDatabase);

    test('TEAM_SUITE - Should update a Team', async () => {
        await request(app)
            .patch('/team/' + team1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                active: false
            }).expect(200);

        // DB validation - document updated
        const team = await Team.findById(team1Id).lean();
        expect(team.active).toBe(false);
    });

    test('TEAM_SUITE - Should NOT update a Team - Invalid field', async () => {
        await request(app)
            .patch('/team/' + team1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                domain: new mongoose.Types.ObjectId()
            }).expect(400);
    });

    test('TEAM_SUITE - Should NOT update a Team - Not found', async () => {
        await request(app)
            .patch('/team/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                active: true
            }).expect(404);
    });

    test('TEAM_SUITE - Should NOT update a Team - Invalid id', async () => {
        await request(app)
            .patch('/team/INVALID_ID')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                active: true
            }).expect(400);
    });
});

describe('Deletion tests', () => {
    beforeAll(setupDatabase);

    test('TEAM_SUITE - Should delete a Team', async () => {
        let response = await request(app)
            .post('/team/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'My Team',
                domain: domainId
            }).expect(201);

        const teamId = response.body._id;

        await request(app)
            .patch('/team/member/add/' + teamId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                member: adminAccountId
            }).expect(200);

        // DB validation
        let admin = await Admin.findById(adminAccountId);
        expect(admin.teams.includes(teamId)).toEqual(true);

        response = await request(app)
            .delete('/team/' + teamId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        // DB validation - document deleted
        const team = await Team.findById(teamId).lean();
        expect(team).toBeNull();

        admin = await Admin.findById(adminAccountId);
        expect(admin.teams.includes(teamId)).toEqual(false);
    });

    test('TEAM_SUITE - Should NOT delete a Team - Not found', async () => {
        await request(app)
            .delete('/team/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(404);
    });

    test('TEAM_SUITE - Should NOT delete a Team - Invalid Id', async () => {
        await request(app)
            .delete('/team/INVALID_ID')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(400);
    });
});

describe('Updating team members tests', () => {
    beforeAll(setupDatabase);

    test('TEAM_SUITE - Should add a team member', async () => {
        await request(app)
            .patch('/team/member/add/' + team1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                member: adminAccountId
            }).expect(200);

        // DB validation
        const admin = await Admin.findById(adminAccountId).lean();
        expect(admin.teams[0]).toEqual(team1._id);
    });

    test('TEAM_SUITE - Should create invite request', async () => {
        let response = await request(app)
            .post('/team/member/invite/' + team1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                email: adminMasterAccount.email
            }).expect(201);

        // DB validation
        let teamInvite = await TeamInvite.findById(response.body._id).lean();
        expect(teamInvite).not.toBeNull();

        response = await request(app)
            .get('/team/member/invite/' + teamInvite._id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                email: adminMasterAccount.email
            }).expect(200);

        expect(response.body.team).toEqual(team1.name);
        expect(response.body.domain).toEqual(domainDocument.name);

        // Should get invite already made
        await request(app)
            .post('/team/member/invite/' + team1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                email: adminMasterAccount.email
            }).expect(200);

        // Should accept invitation
        await request(app)
            .post('/team/member/invite/accept/' + teamInvite._id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        // Should NOT accept invitation - Already used
        await request(app)
            .post('/team/member/invite/accept/' + teamInvite._id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(404);
    });

    test('TEAM_SUITE - Should NOT create invite request - Invalid Team ID', async () => {
        await request(app)
            .post('/team/member/invite/INVALID_ID')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                email: adminMasterAccount.email
            }).expect(400);
    });

    test('TEAM_SUITE - Should NOT get invitation request - Invalid Request ID', async () => {
        await request(app)
            .get('/team/member/invite/INVALID_ID')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                email: adminMasterAccount.email
            }).expect(400);

        await request(app)
            .get('/team/member/invite/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                email: adminMasterAccount.email
            }).expect(404);
    });

    test('TEAM_SUITE - Should get all invitation requests from a team', async () => {
        await request(app)
            .post('/team/member/invite/' + team1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                email: adminMasterAccount.email
            }).expect(201);

        const response = await request(app)
            .get('/team/member/invite/pending/' + team1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);
            
        expect(response.body.length).toEqual(1);
        expect(response.body[0].teamid).toEqual(String(team1Id));
    });

    test('TEAM_SUITE - Should NOT get invitation requests - NO TEAM ID', async () => {
        await request(app)
            .get('/team/member/invite/pending')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(400);
    });

    test('TEAM_SUITE - Should NOT remove team invitaion - TEAM INVITE REQUEST NOT FOUND', async () => {
        await request(app)
            .get('/team/member/invite/pending/' + team1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        await request(app)
            .delete(`/team/member/invite/remove/${team1Id}/${new mongoose.Types.ObjectId()}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(404);
    });

    test('TEAM_SUITE - Should remove team invitaion', async () => {
        let response = await request(app)
            .get('/team/member/invite/pending/' + team1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        const invitationRequest = response.body[0]._id;

        await request(app)
            .delete(`/team/member/invite/remove/${team1Id}/${invitationRequest}`)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);

        response = await request(app)
            .get('/team/member/invite/pending/' + team1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200);
            
        expect(response.body.length).toEqual(0);
    });

    test('TEAM_SUITE - Should NOT accept invite - Team does not exist', async () => {
        const response = await request(app)
            .post('/team/member/invite/accept/' + teamInviteNoTeam._id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(400);

        expect(response.body.error).toEqual('Team does not exist anymore');
    });

    test('TEAM_SUITE - Should NOT add a team member - Team not found', async () => {
        await request(app)
            .patch('/team/member/add/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                member: adminAccountId
            }).expect(404);
    });

    test('TEAM_SUITE - Should NOT add a team member - Member not found', async () => {
        await request(app)
            .patch('/team/member/add/' + team1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                member: new mongoose.Types.ObjectId()
            }).expect(404);
    });

    test('TEAM_SUITE - Should NOT add a team member - Member not given', async () => {
        await request(app)
            .patch('/team/member/add/' + team1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(400);
    });

    test('TEAM_SUITE - Should NOT add a team member - Member already joined', async () => {
        await request(app)
            .patch('/team/member/add/' + team1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                member: adminAccountId
            }).expect(400);
    });

    test('TEAM_SUITE - Should NOT add a team member - Invalid parameter', async () => {
        await request(app)
            .patch('/team/member/add/' + team1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                admin: adminAccountId
            }).expect(400);
    });
    
    test('TEAM_SUITE - Should NOT remove a team member - Team not found', async () => {
        await request(app)
            .patch('/team/member/remove/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                member: adminAccountId
            }).expect(404);
    });

    test('TEAM_SUITE - Should NOT remove a team member - Member not found', async () => {
        await request(app)
            .patch('/team/member/remove/' + team1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                member: new mongoose.Types.ObjectId()
            }).expect(404);
    });

    test('TEAM_SUITE - Should NOT remove a team member - Member do not belong to the team', async () => {
        // Remove member
        await request(app)
            .patch('/team/member/remove/' + team1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                member: adminMasterAccountId
            }).expect(200);

        // Trying to remove again
        await request(app)
            .patch('/team/member/remove/' + team1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                member: adminMasterAccountId
            }).expect(404);
    });

    test('TEAM_SUITE - Should NOT remove a team member - Member not given', async () => {
        await request(app)
            .patch('/team/member/remove/' + team1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(400);
    });

    test('TEAM_SUITE - Should NOT remove a team member - Invalid parameter', async () => {
        await request(app)
            .patch('/team/member/remove/' + team1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                admin: adminAccountId
            }).expect(400);
    });

    test('TEAM_SUITE - Should remove a team member', async () => {
        await request(app)
            .patch('/team/member/remove/' + team1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                member: adminAccountId
            }).expect(200);

        // DB validation
        const admin = await Admin.findById(adminAccountId).lean();
        expect(admin.teams.length).toBe(0);
    });
});

describe('Updating team roles tests', () => {
    beforeAll(setupDatabase);

    test('TEAM_SUITE - Should NOT remove a role - Team not found', async () => {
        await request(app)
            .patch('/team/role/remove/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                role: role1Id
            }).expect(404);
    });

    test('TEAM_SUITE - Should NOT remove a role - Invalid Team Id', async () => {
        await request(app)
            .patch('/team/role/remove/INVALID_ID')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                role: role1Id
            }).expect(400);
    });

    test('TEAM_SUITE - Should NOT remove a role - Invalid parameter', async () => {
        await request(app)
            .patch('/team/role/remove/' + team1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                member: role1Id
            }).expect(400);
    });

    test('TEAM_SUITE - Should NOT remove a role - Role not found', async () => {
        await request(app)
            .patch('/team/role/remove/' + team1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                role: new mongoose.Types.ObjectId()
            }).expect(404);
    });

    test('TEAM_SUITE - Should remove a role', async () => {
        await request(app)
            .patch('/team/role/remove/' + team1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                role: role1Id
            }).expect(200);
    });

});