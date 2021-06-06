// eslint-disable-next-line no-unused-vars
import app from '../../src/app';
import mongoose from 'mongoose';
import { 
    checkDomain, 
    checkGroup, 
    checkSwitcher, 
    checkComponent, 
    checkEnvironment, 
    checkTeam, 
    checkMetrics, 
    checkHistory, 
    checkAdmin,
    checkSlackIntegration,
    notifyAcCreation,
     notifyAcDeletion 
} from '../../src/external/switcher-api-facade';
import { 
    setupDatabase, 
    adminMasterAccountId, 
    adminAccountId, 
    domainId,
    domainDocument,
    groupConfigDocument,
    config1Document
} from '../fixtures/db_api';
import { Switcher } from 'switcher-client';

afterAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mongoose.disconnect();
    process.env.SWITCHER_API_ENABLE = false;
});

describe('Testing Switcher API Facade', () => {
    beforeAll(setupDatabase);

    beforeEach(() => {
        process.env.SWITCHER_API_ENABLE = true;
    });

    test('UNIT_API_FACADE - Should enable feature - Create Domain', async () => {
        const req = {
            admin: adminMasterAccountId
        };

        const call = async () => {
            Switcher.assume('ELEMENT_CREATION').true();
            await checkDomain(req);
        }; 

        await expect(call()).resolves.toBe(undefined);
    });

    test('UNIT_API_FACADE - Should NOT enable feature - Create Domain', async () => {
        const req = {
            admin: adminMasterAccountId
        };

        const call = async () => {
            Switcher.assume('ELEMENT_CREATION').false();
            await checkDomain(req);
        }; 

        await expect(call()).rejects.toThrowError('Domain limit has been reached.');
    });

    test('UNIT_API_FACADE - Should enable feature - Create Group', async () => {
        const call = async () => {
            Switcher.assume('ELEMENT_CREATION').true();
            await checkGroup(domainDocument);
        }; 

        await expect(call()).resolves.toBe(undefined);
    });

    test('UNIT_API_FACADE - Should NOT enable feature - Create Group', async () => {
        const call = async () => {
            Switcher.assume('ELEMENT_CREATION').false();
            await checkGroup(domainDocument);
        }; 

        await expect(call()).rejects.toThrowError('Group limit has been reached.');
    });

    test('UNIT_API_FACADE - Should enable feature - Create Switcher', async () => {
        const call = async () => {
            Switcher.assume('ELEMENT_CREATION').true();
            await checkSwitcher(groupConfigDocument);
        }; 

        await expect(call()).resolves.toBe(undefined);
    });

    test('UNIT_API_FACADE - Should NOT enable feature - Create Switcher', async () => {
        const call = async () => {
            Switcher.assume('ELEMENT_CREATION').false();
            await checkSwitcher(groupConfigDocument);
        }; 

        await expect(call()).rejects.toThrowError('Switcher limit has been reached.');
    });

    test('UNIT_API_FACADE - Should enable feature - Create Component', async () => {
        const call = async () => {
            Switcher.assume('ELEMENT_CREATION').true();
            await checkComponent(domainId);
        }; 

        await expect(call()).resolves.toBe(undefined);
    });

    test('UNIT_API_FACADE - Should NOT enable feature - Create Component', async () => {
        const call = async () => {
            Switcher.assume('ELEMENT_CREATION').false();
            await checkComponent(domainId);
        }; 

        await expect(call()).rejects.toThrowError('Component limit has been reached.');
    });

    test('UNIT_API_FACADE - Should enable feature - Create Environment', async () => {
        const call = async () => {
            Switcher.assume('ELEMENT_CREATION').true();
            await checkEnvironment(domainId);
        }; 

        await expect(call()).resolves.toBe(undefined);
    });

    test('UNIT_API_FACADE - Should NOT enable feature - Create Environment', async () => {
        const call = async () => {
            Switcher.assume('ELEMENT_CREATION').false();
            await checkEnvironment(domainId);
        }; 

        await expect(call()).rejects.toThrowError('Environment limit has been reached.');
    });

    test('UNIT_API_FACADE - Should enable feature - Create Team', async () => {
        const call = async () => {
            Switcher.assume('ELEMENT_CREATION').true();
            await checkTeam(domainId);
        }; 

        await expect(call()).resolves.toBe(undefined);
    });

    test('UNIT_API_FACADE - Should NOT enable feature - Create Team', async () => {
        const call = async () => {
            Switcher.assume('ELEMENT_CREATION').false();
            await checkTeam(domainId);
        }; 

        await expect(call()).rejects.toThrowError('Team limit has been reached.');
    });

    test('UNIT_API_FACADE - Should enable feature - Metrics', async () => {
        //given
        Switcher.assume('ELEMENT_CREATION').true();
        await checkMetrics(config1Document);

        //test
        expect(config1Document.disable_metrics).toBe(undefined);
    });

    test('UNIT_API_FACADE - Should NOT enable feature - Metrics', async () => {
        //given
        Switcher.assume('ELEMENT_CREATION').false();
        await checkMetrics(config1Document);

        //test
        expect(config1Document.disable_metrics).not.toBe(undefined);
    });

    test('UNIT_API_FACADE - Should enable feature - History', async () => {
        //given
        Switcher.assume('ELEMENT_CREATION').true();
        const resultFeature = await checkHistory(domainId);

        //test
        expect(resultFeature).toBe(true);
    });

    test('UNIT_API_FACADE - Should NOT enable feature - History', async () => {
        //given
        Switcher.assume('ELEMENT_CREATION').false();
        const resultFeature = await checkHistory(domainId);

        //test
        expect(resultFeature).toBe(false);
    });

    test('UNIT_API_FACADE - Should enable feature - Sign up new Account', async () => {
        const call = async () => {
            Switcher.assume('ACCOUNT_CREATION').true();
            await checkAdmin('mail@mail.com');
        }; 

        await expect(call()).resolves.toBe(undefined);
    });

    test('UNIT_API_FACADE - Should NOT enable feature - Sign up new Account', async () => {
        const call = async () => {
            Switcher.assume('ACCOUNT_CREATION').false();
            await checkAdmin('dev@dev.com');
        }; 

        await expect(call()).rejects.toThrowError('Account not released to use the API.');
    });

    test('UNIT_API_FACADE - Should notify external service - Account being registered', async () => {
        Switcher.assume('ACCOUNT_IN_NOTIFY').true();
        expect(notifyAcCreation(adminAccountId)).toBe(undefined);
    });

    test('UNIT_API_FACADE - Should notify external service - Account being unregistered', async () => {
        Switcher.assume('ACCOUNT_OUT_NOTIFY').true();
        expect(notifyAcDeletion(adminAccountId)).toBe(undefined);
    });

    test('UNIT_API_FACADE - Should enable feature - Slack Integration', async () => {
        const call = async () => {
            Switcher.assume('SLACK_INTEGRATION').true();
            await checkSlackIntegration('admin_id');
        }; 

        await expect(call()).resolves.toBe(undefined);
    });

    test('UNIT_API_FACADE - Should NOT enable feature - Slack Integration', async () => {
        const call = async () => {
            Switcher.assume('SLACK_INTEGRATION').false();
            await checkSlackIntegration('admin_id');
        }; 

        await expect(call()).rejects.toThrowError('Slack Integration is not available.');
    });

});