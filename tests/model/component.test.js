require('../../src/db/mongoose');

import { randomBytes } from 'crypto';
import bcryptjs from 'bcryptjs';
import mongoose from 'mongoose';
import { 
    setupDatabase,
    adminMasterAccountId,
    domainId,
    domainDocument
 } from '../fixtures/db_api';
import Component from '../../src/models/component';

afterAll(async () => { 
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mongoose.disconnect();
});

describe('(Deprecated) Testing component authentication', () => {
    beforeAll(async () => await setupDatabase());

    /**
     * Generates API key using old method
     */
    const generateApiKeyDeprecated = async (component) => {
        const buffer = randomBytes(32);
        const apiKey = Buffer.from(buffer).toString('base64');
        const hash = await bcryptjs.hash(apiKey, 8);
        component.apihash = hash;
        await component.save();

        const generatedApiKey = Buffer.from(apiKey).toString('base64');
        return generatedApiKey;
    }

    test('COMPONENT_MODEL - Should authenticate component using old API key format', async () => {
        // Given
        const componentId = new mongoose.Types.ObjectId();
        const component = new Component({
            _id: componentId,
            name: 'TestDeprecatedAPIKey',
            description: 'Test app with depracated API key',
            domain: domainId,
            owner: adminMasterAccountId
        });

        // That
        const generatedApiKey = await generateApiKeyDeprecated(component);
        
        // Test
        const result = await Component.findByCredentials(domainDocument.name, component.name, generatedApiKey);
        expect(result.component).not.toBe(undefined);
    });

    test('COMPONENT_MODEL - Should authenticate component using new API key format', async () => {
        // Given
        const componentId = new mongoose.Types.ObjectId();
        const component = new Component({
            _id: componentId,
            name: 'TestNewAPIKey',
            description: 'Test app with New API key',
            domain: domainId,
            owner: adminMasterAccountId
        });

        // That
        const generatedApiKey = await component.generateApiKey();
        
        // Test
        const result = await Component.findByCredentials(domainDocument.name, component.name, generatedApiKey);
        expect(result.component).not.toBe(undefined);
    });

});
