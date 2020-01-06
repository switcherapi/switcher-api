import mongoose from 'mongoose';
import app from '../../src/app';
import GroupConfig from '../../src/models/group-config';
import { Team } from '../../src/models/team';
import { Role, ActionTypes, RouterTypes } from '../../src/models/role';
import { verifyOwnership, PermissionError } from '../../src/routers/common/index';
import { 
    setupDatabase, 
    adminMasterAccount,
    adminAccount, 
    domainDocument,
    groupConfig2Document,
    configDocument,
    domainId,
    role1Id,
    role2Id,
    role3Id,
    adminAccount2,
    team1Id,
    adminAccount3
 } from '../fixtures/db_team_role';

const changeRoleStatus = async (roleId, status) => {
    const role = await Role.findById(roleId);
    role.active = status;
    await role.save();
}

const changeRoleAction = async (roleId, action) => {
    const role = await Role.findById(roleId);
    role.action = action;
    await role.save();
}

const changeTeamStatus = async (teamId, status) => {
    const team = await Team.findById(teamId);
    team.active = status;
    await team.save();
}

afterAll(async () => { 
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mongoose.disconnect()
})

describe('Success tests', () => {
    beforeAll(setupDatabase);

    test('UNIT_TEAM_ROLE_SUITE - Should allow access - Element owner', async () => {
        try {
            const element = await verifyOwnership(
                adminMasterAccount, 
                domainDocument, 
                domainDocument, 
                ActionTypes.READ, 
                RouterTypes.DOMAIN)

            expect(element._id).toEqual(domainDocument._id)
        } catch (e) {
            expect(e).toBeNull();
        }
    })

    test('UNIT_TEAM_ROLE_SUITE - Should allow access - Member has permission to select group', async () => {
        try {
            const element = await verifyOwnership(
                adminAccount, 
                groupConfig2Document, 
                domainDocument, 
                ActionTypes.READ, 
                RouterTypes.GROUP)

            expect(element._id).toEqual(groupConfig2Document._id)
        } catch (e) {
            expect(e).toBeNull();
        }
    })

    test('UNIT_TEAM_ROLE_SUITE - Should allow access - Member has permission to select just one of those', async () => {
        try {
            let groups = await GroupConfig.find({ domain: domainId })
            expect(groups.length).toEqual(2)

            const element = await verifyOwnership(
                adminAccount, 
                groups, 
                domainDocument, 
                ActionTypes.READ, 
                RouterTypes.GROUP)

            expect(element.length).toEqual(1)
        } catch (e) {
            expect(e).toBeNull();
        }
    })

    test('UNIT_TEAM_ROLE_SUITE - Should allow access - Member has permission to delete', async () => {
        try {
            const element = await verifyOwnership(
                adminAccount, 
                configDocument, 
                domainDocument, 
                ActionTypes.DELETE, 
                RouterTypes.CONFIG)

            expect(element).toMatchObject(configDocument)
        } catch (e) {
            expect(e).toBeNull();
        }
    })

    test('UNIT_TEAM_ROLE_SUITE - Should allow access - Member has permission to select config', async () => {
        await changeRoleAction(role1Id, ActionTypes.READ);
        await changeRoleAction(role3Id, ActionTypes.UPDATE);
        
        try {
            const element = await verifyOwnership(
                adminAccount, 
                configDocument, 
                domainDocument, 
                ActionTypes.READ, 
                RouterTypes.CONFIG)

            expect(element).toMatchObject(configDocument)
        } catch (e) {
            expect(e).toBeNull();
        } finally {
            await changeRoleAction(role1Id, ActionTypes.DELETE);
            await changeRoleAction(role3Id, ActionTypes.READ);
        }
    })

    test('UNIT_TEAM_ROLE_SUITE - Should allow access - Member has ALL select permissions', async () => {
        try {
            let element = await verifyOwnership(
                adminAccount3, 
                groupConfig2Document, 
                domainDocument, 
                ActionTypes.READ, 
                RouterTypes.GROUP)

            expect(element._id).toEqual(groupConfig2Document._id)

            element = await verifyOwnership(
                adminAccount3, 
                domainDocument, 
                domainDocument, 
                ActionTypes.READ, 
                RouterTypes.DOMAIN)

            expect(element._id).toEqual(domainDocument._id)

            element = await verifyOwnership(
                adminAccount3, 
                configDocument, 
                domainDocument, 
                ActionTypes.READ, 
                RouterTypes.CONFIG)

            expect(element._id).toEqual(configDocument._id)

            let groups = await GroupConfig.find({ domain: domainId })
            expect(groups.length).toEqual(2)

            element = await verifyOwnership(
                adminAccount3, 
                groups, 
                domainDocument, 
                ActionTypes.READ, 
                RouterTypes.GROUP)

            expect(element.length).toEqual(2)
        } catch (e) {
            expect(e).toBeNull();
        }
    })
    
})

describe('Error tests', () => {

    test('UNIT_TEAM_ROLE_SUITE - Should NOT allow access - Role innactive', async () => {
        await changeRoleStatus(role2Id, false)
        
        try {
            const element = await verifyOwnership(
                adminAccount, 
                groupConfig2Document, 
                domainDocument, 
                ActionTypes.READ, 
                RouterTypes.GROUP)

            expect(element).toBeNull();
        } catch (e) {
            expect(e).toEqual(new PermissionError(`Role not found for this operation: '${ActionTypes.READ}' - '${RouterTypes.GROUP}'`))
        } finally {
            await changeRoleStatus(role2Id, true)
        }
    })

    test('UNIT_TEAM_ROLE_SUITE - Should NOT allow access - Role not found', async () => {
        try {
            const element = await verifyOwnership(
                adminAccount, 
                domainDocument, 
                domainDocument, 
                ActionTypes.CREATE, 
                RouterTypes.GROUP)

            expect(element).toBeNull();
        } catch (e) {
            expect(e).toEqual(new PermissionError(`Role not found for this operation: '${ActionTypes.CREATE}' - '${RouterTypes.GROUP}'`))
        }
    })

    test('UNIT_TEAM_ROLE_SUITE - Should NOT allow access - Role does not match', async () => {
        try {
            const element = await verifyOwnership(
                adminAccount, 
                configDocument, 
                domainDocument, 
                ActionTypes.READ, 
                RouterTypes.CONFIG)

            expect(element).toBeNull();
        } catch (e) {
            expect(e).toEqual(new Error('It was not possible to match the requiring element to the current role'))
        }
    })

    test('UNIT_TEAM_ROLE_SUITE - Should NOT allow access - Member does not belong to a team', async () => {
        try {
            const element = await verifyOwnership(
                adminAccount2, 
                domainDocument, 
                domainDocument, 
                ActionTypes.READ, 
                RouterTypes.DOMAIN)

            expect(element).toBeNull();
        } catch (e) {
            expect(e).toEqual(new Error('It was not possible to find any team that allows you to proceed with this operation'))
        }
    })

    test('UNIT_TEAM_ROLE_SUITE - Should NOT allow access - Team innactive', async () => {
        await changeTeamStatus(team1Id, false)

        try {
            const element = await verifyOwnership(
                adminAccount, 
                groupConfig2Document, 
                domainDocument, 
                ActionTypes.READ, 
                RouterTypes.GROUP)

                expect(element).toBeNull();
        } catch (e) {
            expect(e).toEqual(new Error('Team is not active to verify this operation'))
        } finally {
            await changeTeamStatus(team1Id, true)
        }
    })

})