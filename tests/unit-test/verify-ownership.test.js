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
    adminAccount3,
    permission21Id,
    permission4Id,
    permission22Id
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

    beforeEach(async () => {
        await changePermissionStatus(permission1Id, false);
        await changePermissionStatus(permission2Id, false);
        await changePermissionStatus(permission21Id, false);
        await changePermissionStatus(permission22Id, false);
        await changePermissionStatus(permission3Id, false);
        await changePermissionStatus(permission4Id, false);
    });

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
        //given
        //enabled Read - Group  (by name)
        await changePermissionStatus(permission2Id, true);

        //test
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
        //given
        //disabled Read - Group (by name)
        await changePermissionStatus(permission2Id, false);

        //enabled Read - Config (by name)
        await changePermissionStatus(permission3Id, true);

        //test
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

    test('UNIT_TEAM_PERMISSION_SUITE - Should allow access - Member has permission to select just one of 2 groups', async () => {
        //given
        //enabled Read - Group (by name)
        await changePermissionStatus(permission2Id, true);

        //disabled Read - Group (all)
        await changePermissionStatus(permission21Id, false);

        let groups = await GroupConfig.find({ domain: domainId }).exec();
        expect(groups.length).toEqual(2);

        //test
        const element = await verifyOwnership(
                adminAccount, 
                groups, 
                domainDocument, 
                ActionTypes.READ, 
                RouterTypes.GROUP);

        expect(element.length).toEqual(1);
    });

    test('UNIT_TEAM_PERMISSION_SUITE - Should allow access and merge team permissions', async () => {
        //given
        //enabled Read - Group (by name)
        await changePermissionStatus(permission2Id, true);

        //enabled Read - Group (all)
        await changePermissionStatus(permission21Id, true);

        let groups = await GroupConfig.find({ domain: domainId }).exec();
        expect(groups.length).toEqual(2);

        //test
        const element = await verifyOwnership(
                adminAccount, 
                groups, 
                domainDocument, 
                ActionTypes.READ, 
                RouterTypes.GROUP);

        expect(element.length).toEqual(2);
    });

    test('UNIT_TEAM_PERMISSION_SUITE - Should allow access - Member has permission to delete', async () => {
        await changePermissionStatus(permission1Id, true);
        
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
        await changePermissionStatus(permission1Id, true);
        await changePermissionStatus(permission3Id, true);
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
        await changePermissionStatus(permission4Id, true);

        try {
            let element = await verifyOwnership(
                adminAccount3, 
                domainDocument, 
                domainDocument, 
                ActionTypes.READ, 
                RouterTypes.DOMAIN);

            expect(element).toMatchObject(domainDocument);

            element = await verifyOwnership(
                adminAccount3, 
                groupConfig2Document, 
                domainDocument, 
                ActionTypes.READ, 
                RouterTypes.GROUP);

            expect(element).toMatchObject(groupConfig2Document);

            element = await verifyOwnership(
                adminAccount3, 
                configDocument, 
                domainDocument, 
                ActionTypes.READ, 
                RouterTypes.CONFIG);

            expect(element).toMatchObject(configDocument);

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
    beforeAll(setupDatabase);

    beforeEach(async () => {
        await changePermissionStatus(permission1Id, false);
        await changePermissionStatus(permission2Id, false);
        await changePermissionStatus(permission21Id, false);
        await changePermissionStatus(permission22Id, false);
        await changePermissionStatus(permission3Id, false);
        await changePermissionStatus(permission4Id, false);
    });

    test('UNIT_TEAM_PERMISSION_SUITE - Should NOT allow access - Permission innactive', async () => {
        await changePermissionStatus(permission2Id, false);

        expect(async () => {
            await verifyOwnership(
                adminAccount, 
                groupConfig2Document, 
                domainDocument, 
                ActionTypes.READ, 
                RouterTypes.GROUP);
        }).rejects.toThrow(new PermissionError(`Action forbidden`));
    });

    test('UNIT_TEAM_PERMISSION_SUITE - Should NOT allow access - Permission not found', async () => {
        expect(async () => {
            await verifyOwnership(
                adminAccount, 
                domainDocument, 
                domainDocument, 
                ActionTypes.CREATE, 
                RouterTypes.GROUP);
        }).rejects.toThrow(new PermissionError(`Action forbidden`));
    });

    test('UNIT_TEAM_PERMISSION_SUITE - Should NOT allow access - Permission does not match', async () => {
        expect(async () => {
            await verifyOwnership(
                adminAccount, 
                configDocument, 
                domainDocument, 
                ActionTypes.READ, 
                RouterTypes.CONFIG);
        }).rejects.toThrow(new PermissionError(`Action forbidden`));
    });

    test('UNIT_TEAM_PERMISSION_SUITE - Should NOT allow access - Member does not belong to a team', async () => {
        expect(async () => {
            await verifyOwnership(
                adminAccount2, 
                domainDocument, 
                domainDocument, 
                ActionTypes.READ, 
                RouterTypes.DOMAIN);
        }).rejects.toThrow(new PermissionError(`It was not possible to find any team that allows you to proceed with this operation`));
    });

    test('UNIT_TEAM_PERMISSION_SUITE - Should NOT allow access - Team not active', async () => {
        await changeTeamStatus(team1Id, false);

        expect(async () => {
            await verifyOwnership(
                adminAccount, 
                groupConfig2Document, 
                domainDocument, 
                ActionTypes.READ, 
                RouterTypes.GROUP);
        }).rejects.toThrow(new PermissionError(`Action forbidden`));

        // tearDown
        await changeTeamStatus(team1Id, true);
    });

    test('UNIT_TEAM_PERMISSION_SUITE - Should NOT allow access - Group name does not exist', async () => {
        //given
        //enabled Read - Group (by name)
        await changePermissionStatus(permission22Id, true);

        let groups = await GroupConfig.find({ domain: domainId }).exec();
        expect(groups.length).toEqual(2);

        expect(async () => {
            await verifyOwnership(
                adminAccount, 
                groups, 
                domainDocument, 
                ActionTypes.READ, 
                RouterTypes.GROUP);
        }).rejects.toThrow(new PermissionError(`Action forbidden`));
    });

});