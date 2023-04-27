// eslint-disable-next-line no-unused-vars
import app from '../../src/app';
import mongoose from 'mongoose';
import GroupConfig from '../../src/models/group-config';
import { Team } from '../../src/models/team';
import { Permission, ActionTypes, RouterTypes } from '../../src/models/permission';
import { verifyOwnership } from '../../src/helpers';
import { 
    setupDatabase, 
    adminMasterAccount,
    adminAccount, 
    domainDocument,
    groupConfig2Document,
    configDocument,
    domainId,
    permission1Id,
    permission2Id,
    permission3Id,
    adminAccount2,
    team1Id,
    adminAccount3
 } from '../fixtures/db_team_permission';
import { PermissionError } from '../../src/exceptions';

const changePermissionStatus = async (permissionId, status) => {
    const permission = await Permission.findById(permissionId).exec();
    permission.active = status;
    await permission.save();
};

const changePermissionAction = async (permissionId, action) => {
    const permission = await Permission.findById(permissionId).exec();
    permission.action = action;
    await permission.save();
};

const changeTeamStatus = async (teamId, status) => {
    const team = await Team.findById(teamId).exec();
    team.active = status;
    await team.save();
};

afterAll(async () => { 
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mongoose.disconnect();
});

describe('Success tests', () => {
    beforeAll(setupDatabase);

    test('UNIT_TEAM_PERMISSION_SUITE - Should allow access - Element owner', async () => {
        try {
            const element = await verifyOwnership(
                adminMasterAccount, 
                domainDocument, 
                domainDocument, 
                ActionTypes.READ, 
                RouterTypes.DOMAIN);

            expect(element._id).toEqual(domainDocument._id);
        } catch (e) {
            expect(e).toBeNull();
        }
    });

    test('UNIT_TEAM_PERMISSION_SUITE - Should allow access - Member has permission to select group', async () => {
        // Given
        // Enabled Read - Group 
        await changePermissionStatus(permission2Id, true);

        // Test
        try {
            const element = await verifyOwnership(
                adminAccount, 
                groupConfig2Document, 
                domainDocument, 
                ActionTypes.READ, 
                RouterTypes.GROUP);

            expect(element._id).toEqual(groupConfig2Document._id);
        } catch (e) {
            expect(e).toBeNull();
        }
    });

    test('UNIT_TEAM_PERMISSION_SUITE - Should allow access - Member has permission to select group - Cascade', async () => {
        // Given
        // Disabled Read - Group 
        await changePermissionStatus(permission2Id, false);

        // Enabled Read - Config 
        await changePermissionStatus(permission3Id, true);

        // Test
        try {
            const element = await verifyOwnership(
                adminAccount, 
                groupConfig2Document, 
                domainDocument, 
                ActionTypes.READ, 
                RouterTypes.GROUP,
                true);

            expect(element._id).toEqual(groupConfig2Document._id);
        } catch (e) {
            expect(e).toBeNull();
        }
    });

    test('UNIT_TEAM_PERMISSION_SUITE - Should allow access - Member has permission to select just one of those', async () => {
        // Given
        // Enabled Read - Group 
        await changePermissionStatus(permission2Id, true);

        // Test
        try {
            let groups = await GroupConfig.find({ domain: domainId }).exec();
            expect(groups.length).toEqual(2);

            const element = await verifyOwnership(
                adminAccount, 
                groups, 
                domainDocument, 
                ActionTypes.READ, 
                RouterTypes.GROUP);

            expect(element.length).toEqual(1);
        } catch (e) {
            expect(e).toBeNull();
        }
    });

    test('UNIT_TEAM_PERMISSION_SUITE - Should allow access - Member has permission to delete', async () => {
        try {
            const element = await verifyOwnership(
                adminAccount, 
                configDocument, 
                domainDocument, 
                ActionTypes.DELETE, 
                RouterTypes.CONFIG);

            expect(element).toMatchObject(configDocument);
        } catch (e) {
            expect(e).toBeNull();
        }
    });

    test('UNIT_TEAM_PERMISSION_SUITE - Should allow access - Member has permission to select config', async () => {
        await changePermissionAction(permission1Id, ActionTypes.READ);
        await changePermissionAction(permission3Id, ActionTypes.UPDATE);
        
        try {
            const element = await verifyOwnership(
                adminAccount, 
                configDocument, 
                domainDocument, 
                ActionTypes.READ, 
                RouterTypes.CONFIG);

            expect(element).toMatchObject(configDocument);
        } catch (e) {
            expect(e).toBeNull();
        } finally {
            await changePermissionAction(permission1Id, ActionTypes.DELETE);
            await changePermissionAction(permission3Id, ActionTypes.READ);
        }
    });

    test('UNIT_TEAM_PERMISSION_SUITE - Should allow access - Member has ALL select permissions', async () => {
        try {
            let element = await verifyOwnership(
                adminAccount3, 
                groupConfig2Document, 
                domainDocument, 
                ActionTypes.READ, 
                RouterTypes.GROUP);

            expect(element._id).toEqual(groupConfig2Document._id);

            element = await verifyOwnership(
                adminAccount3, 
                domainDocument, 
                domainDocument, 
                ActionTypes.READ, 
                RouterTypes.DOMAIN);

            expect(element._id).toEqual(domainDocument._id);

            element = await verifyOwnership(
                adminAccount3, 
                configDocument, 
                domainDocument, 
                ActionTypes.READ, 
                RouterTypes.CONFIG);

            expect(element._id).toEqual(configDocument._id);

            let groups = await GroupConfig.find({ domain: domainId }).exec();
            expect(groups.length).toEqual(2);

            element = await verifyOwnership(
                adminAccount3, 
                groups, 
                domainDocument, 
                ActionTypes.READ, 
                RouterTypes.GROUP);

            expect(element.length).toEqual(2);
        } catch (e) {
            expect(e).toBeNull();
        }
    });
    
});

describe('Error tests', () => {

    test('UNIT_TEAM_PERMISSION_SUITE - Should NOT allow access - Permission innactive', async () => {
        await changePermissionStatus(permission2Id, false);
        
        try {
            const element = await verifyOwnership(
                adminAccount, 
                groupConfig2Document, 
                domainDocument, 
                ActionTypes.READ, 
                RouterTypes.GROUP);

            expect(element).toBeNull();
        } catch (e) {
            expect(e).toEqual(new PermissionError(`Permission not found for this operation: '${ActionTypes.READ}' - '${RouterTypes.GROUP}'`));
        } finally {
            await changePermissionStatus(permission2Id, true);
        }
    });

    test('UNIT_TEAM_PERMISSION_SUITE - Should NOT allow access - Permission not found', async () => {
        try {
            const element = await verifyOwnership(
                adminAccount, 
                domainDocument, 
                domainDocument, 
                ActionTypes.CREATE, 
                RouterTypes.GROUP);

            expect(element).toBeNull();
        } catch (e) {
            expect(e).toEqual(new PermissionError(`Permission not found for this operation: '${ActionTypes.CREATE}' - '${RouterTypes.GROUP}'`));
        }
    });

    test('UNIT_TEAM_PERMISSION_SUITE - Should NOT allow access - Permission does not match', async () => {
        try {
            const element = await verifyOwnership(
                adminAccount, 
                configDocument, 
                domainDocument, 
                ActionTypes.READ, 
                RouterTypes.CONFIG);

            expect(element).toBeNull();
        } catch (e) {
            expect(e).toEqual(new Error('It was not possible to match the requiring element to the current permission'));
        }
    });

    test('UNIT_TEAM_PERMISSION_SUITE - Should NOT allow access - Member does not belong to a team', async () => {
        try {
            const element = await verifyOwnership(
                adminAccount2, 
                domainDocument, 
                domainDocument, 
                ActionTypes.READ, 
                RouterTypes.DOMAIN);

            expect(element).toBeNull();
        } catch (e) {
            expect(e).toEqual(new Error('It was not possible to find any team that allows you to proceed with this operation'));
        }
    });

    test('UNIT_TEAM_PERMISSION_SUITE - Should NOT allow access - Team not active', async () => {
        await changeTeamStatus(team1Id, false);

        try {
            const element = await verifyOwnership(
                adminAccount, 
                groupConfig2Document, 
                domainDocument, 
                ActionTypes.READ, 
                RouterTypes.GROUP);

                expect(element).toBeNull();
        } catch (e) {
            expect(e).toEqual(new Error('It was not possible to find any team that allows you to proceed with this operation'));
        } finally {
            await changeTeamStatus(team1Id, true);
        }
    });

});