import mongoose from 'mongoose';
import request from 'supertest';
import app from '../src/app';
import { Team } from '../src/models/team';
import Admin from '../src/models/admin';
import { 
    setupDatabase,
    adminMasterAccountToken,
    domainId,
    team1Id,
    adminAccountId,
    role1Id,
    team1,
    role1,
    adminMasterAccountId
 } from './fixtures/db_api';

afterAll(async () => { 
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mongoose.disconnect()
})

describe('Insertion tests', () => {
    beforeAll(setupDatabase)

    test('TEAM_SUITE - Should create a new Team', async () => {
        const response = await request(app)
            .post('/team/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'My Team',
                domain: domainId
            }).expect(201)

        // DB validation - document created
        const team = await Team.findById(response.body._id)
        expect(team).not.toBeNull()

        // Response validation
        expect(response.body.name).toBe('My Team')
    })

    test('TEAM_SUITE - Should create a new Team - With default select and create permission', async () => {
        const response = await request(app)
            .post('/team/create/?defaultActions=SELECT,CREATE')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'My Team 2',
                domain: domainId
            }).expect(201)

        // DB validation - document created
        const team = await Team.findById(response.body._id)
        expect(team).not.toBeNull()
        expect(team.roles.length).toEqual(2)
    })

    test('TEAM_SUITE - Should NOT create a new Team - Invalid action permission', async () => {
        const response = await request(app)
            .post('/team/create/?defaultActions=INVALID_ACTION')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'My Team 2',
                domain: domainId
            }).expect(400)

        expect(response.body.error).toEqual('Role validation failed: action: \'INVALID_ACTION\' is not a valid enum value.')
    })

    test('TEAM_SUITE - Should NOT create a new Team - Domain not found', async () => {
        await request(app)
            .post('/team/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'My Team',
                domain: new mongoose.Types.ObjectId()
            }).expect(404)
    })

    test('TEAM_SUITE - Should NOT create a new Team - Invalid domain Id', async () => {
        await request(app)
            .post('/team/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'My Team',
                domain: 'INVALID_ID'
            }).expect(400)
    })

    test('TEAM_SUITE - Should NOT create a new Team - Name is missing', async () => {
        await request(app)
            .post('/team/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                domain: domainId
            }).expect(422)
    })
})

describe('Reading tests', () => {

    let teamId

    beforeAll(async () => {
        const response = await request(app)
            .post('/team/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'My Team',
                domain: domainId
            }).expect(201)

        teamId = response.body._id
    })

    test('TEAM_SUITE - Should read all Teams from a Domain', async () => {
        const response = await request(app)
            .get('/team?domain=' + domainId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)

        expect(response.body[0].name).toBe('My Team')
    })

    test('TEAM_SUITE - Should NOT read all Teams from a Domain - Invalid domain Id', async () => {
        const response = await request(app)
            .get('/team?domain=INVALID_ID')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(400)
    })

    test('TEAM_SUITE - Should read one single Team', async () => {
        const response = await request(app)
            .get('/team/' + teamId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)

        expect(response.body.name).toBe('My Team')
    })

    test('TEAM_SUITE - Should NOT read Team - Not found', async () => {
        await request(app)
            .get('/team/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(404)
    })

    test('TEAM_SUITE - Should NOT read Team - Invalid Id', async () => {
        await request(app)
            .get('/team/INVALID_ID')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(400)
    })

    test('TEAM_SUITE - Should NOT read Team - Domain Id not provided', async () => {
        await request(app)
            .get('/team')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(500)
    })
})

describe('Updating tests', () => {
    beforeAll(setupDatabase)

    test('TEAM_SUITE - Should update a Team', async () => {
        await request(app)
            .patch('/team/' + team1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                active: false
            }).expect(200)

        // DB validation - document updated
        const team = await Team.findById(team1Id)
        expect(team.active).toBe(false)
    })

    test('TEAM_SUITE - Should NOT update a Team - Invalid field', async () => {
        await request(app)
            .patch('/team/' + team1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                domain: new mongoose.Types.ObjectId()
            }).expect(400)
    })

    test('TEAM_SUITE - Should NOT update a Team - Not found', async () => {
        await request(app)
            .patch('/team/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                active: true
            }).expect(404)
    })

    test('TEAM_SUITE - Should NOT update a Team - Invalid id', async () => {
        await request(app)
            .patch('/team/INVALID_ID')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                active: true
            }).expect(400)
    })
})

describe('Deletion tests', () => {
    beforeAll(setupDatabase)

    test('TEAM_SUITE - Should delete a Team', async () => {
        let response = await request(app)
            .post('/team/create')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                name: 'My Team',
                domain: domainId
            }).expect(201)

        const teamId = response.body._id

        await request(app)
            .patch('/team/member/add/' + teamId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                member: adminAccountId
            }).expect(200)

        // DB validation
        let admin = await Admin.findById(adminAccountId)
        expect(admin.teams.includes(teamId)).toEqual(true)

        response = await request(app)
            .delete('/team/' + teamId)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(200)

        // DB validation - document deleted
        const team = await Team.findById(teamId)
        expect(team).toBeNull()

        admin = await Admin.findById(adminAccountId)
        expect(admin.teams.includes(teamId)).toEqual(false)
    })

    test('TEAM_SUITE - Should NOT delete a Team - Not found', async () => {
        await request(app)
            .delete('/team/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(404)
    })

    test('TEAM_SUITE - Should NOT delete a Team - Invalid Id', async () => {
        await request(app)
            .delete('/team/INVALID_ID')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(400)
    })
})

describe('Updating team members tests', () => {
    beforeAll(setupDatabase)

    test('TEAM_SUITE - Should add a team member', async () => {
        await request(app)
            .patch('/team/member/add/' + team1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                member: adminAccountId
            }).expect(200)

        // DB validation
        const admin = await Admin.findById(adminAccountId)
        expect(admin.teams[0]).toEqual(team1._id)
    })

    test('TEAM_SUITE - Should NOT add a team member - Team not found', async () => {
        await request(app)
            .patch('/team/member/add/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                member: adminAccountId
            }).expect(404)
    })

    test('TEAM_SUITE - Should NOT add a team member - Member not found', async () => {
        await request(app)
            .patch('/team/member/add/' + team1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                member: new mongoose.Types.ObjectId()
            }).expect(404)
    })

    test('TEAM_SUITE - Should NOT add a team member - Member not given', async () => {
        await request(app)
            .patch('/team/member/add/' + team1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(400)
    })

    test('TEAM_SUITE - Should NOT add a team member - Member already joined', async () => {
        await request(app)
            .patch('/team/member/add/' + team1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                member: adminAccountId
            }).expect(400)
    })

    test('TEAM_SUITE - Should NOT add a team member - Invalid parameter', async () => {
        await request(app)
            .patch('/team/member/add/' + team1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                admin: adminAccountId
            }).expect(400)
    })
    
    test('TEAM_SUITE - Should NOT remove a team member - Team not found', async () => {
        await request(app)
            .patch('/team/member/remove/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                member: adminAccountId
            }).expect(404)
    })

    test('TEAM_SUITE - Should NOT remove a team member - Member not found', async () => {
        await request(app)
            .patch('/team/member/remove/' + team1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                member: new mongoose.Types.ObjectId()
            }).expect(404)
    })

    test('TEAM_SUITE - Should NOT remove a team member - Member do not belong to the team', async () => {
        await request(app)
            .patch('/team/member/remove/' + team1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                member: adminMasterAccountId
            }).expect(404)
    })

    test('TEAM_SUITE - Should NOT remove a team member - Member not given', async () => {
        await request(app)
            .patch('/team/member/remove/' + team1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send().expect(400)
    })

    test('TEAM_SUITE - Should NOT remove a team member - Invalid parameter', async () => {
        await request(app)
            .patch('/team/member/remove/' + team1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                admin: adminAccountId
            }).expect(400)
    })

    test('TEAM_SUITE - Should remove a team member', async () => {
        await request(app)
            .patch('/team/member/remove/' + team1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                member: adminAccountId
            }).expect(200)

        // DB validation
        const admin = await Admin.findById(adminAccountId)
        expect(admin.teams.length).toBe(0)
    })
})

describe('Updating team roles tests', () => {
    beforeAll(setupDatabase)

    test('TEAM_SUITE - Should add a new role', async () => {
        await request(app)
            .patch('/team/role/add/' + team1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                role: role1Id
            }).expect(200)

        // DB validation
        const team = await Team.findById(team1Id)
        expect(team.roles[0]).toEqual(role1._id)
    })

    test('TEAM_SUITE - Should NOT add a new role - Team not found', async () => {
        await request(app)
            .patch('/team/role/add/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                role: role1Id
            }).expect(404)
    })

    test('TEAM_SUITE - Should NOT add a new role - Invalid Team Id', async () => {
        await request(app)
            .patch('/team/role/add/INVALID_ID')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                role: role1Id
            }).expect(400)
    })

    test('TEAM_SUITE - Should NOT add a new role - Invalid parameter', async () => {
        await request(app)
            .patch('/team/role/add/' + team1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                member: role1Id
            }).expect(400)
    })

    test('TEAM_SUITE - Should NOT add a new role - Role not found', async () => {
        await request(app)
            .patch('/team/role/add/' + team1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                role: new mongoose.Types.ObjectId()
            }).expect(404)
    })

    test('TEAM_SUITE - Should NOT add a new role - Role already added', async () => {
        await request(app)
            .patch('/team/role/add/' + team1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                role: role1Id
            }).expect(400)
    })

    test('TEAM_SUITE - Should NOT remove a role - Team not found', async () => {
        await request(app)
            .patch('/team/role/remove/' + new mongoose.Types.ObjectId())
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                role: role1Id
            }).expect(404)
    })

    test('TEAM_SUITE - Should NOT remove a role - Invalid Team Id', async () => {
        await request(app)
            .patch('/team/role/remove/INVALID_ID')
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                role: role1Id
            }).expect(400)
    })

    test('TEAM_SUITE - Should NOT remove a role - Invalid parameter', async () => {
        await request(app)
            .patch('/team/role/remove/' + team1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                member: role1Id
            }).expect(400)
    })

    test('TEAM_SUITE - Should NOT remove a role - Role not found', async () => {
        await request(app)
            .patch('/team/role/remove/' + team1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                role: new mongoose.Types.ObjectId()
            }).expect(404)
    })

    test('TEAM_SUITE - Should remove a role', async () => {
        await request(app)
            .patch('/team/role/remove/' + team1Id)
            .set('Authorization', `Bearer ${adminMasterAccountToken}`)
            .send({
                role: role1Id
            }).expect(200)
    })

})