require('../../src/db/mongoose');

import mongoose from 'mongoose';
import { recordHistory } from '../../src/models/common/index';
import { setupDatabase } from '../fixtures/db_history';

afterAll(async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mongoose.disconnect();
});

describe('Test recordHistory function', () => {
    beforeAll(async () => await setupDatabase());

    beforeEach(() => {
        process.env.HISTORY_ACTIVATED = 'true';
    });

    test('MODEL_COMMON - Should record history diff', async () => {
        // Given
        const _id = new mongoose.Types.ObjectId();
        const oldDocument = {
            _id,
            name: 'name',
            description: 'test',
            createdAt: '2020-07-11T08:00:00.000Z'
        };

        const newDocument = {
            _id,
            name: 'new name',
            description: 'test',
            createdAt: '2020-07-11T08:00:00.000Z',
            updatedAt: '2020-07-12T08:00:00.000Z',
            updatedBy: 'Automated test'
        };

        const domainId = new mongoose.Types.ObjectId();
        const ignoredFields = ['_id', 'updatedAt'];
        const modifiedField = ['name'];

        // Test
        const result = await recordHistory(modifiedField, oldDocument, newDocument, domainId, ignoredFields);
        expect(result).toEqual(
            expect.objectContaining({
                domainId,
                elementId: _id,
                oldValue: expect.any(Map),
                newValue: expect.any(Map),
                updatedBy: 'Automated test'
            })
        );

        expect(result.oldValue.get('name')).toEqual('name');
        expect(result.newValue.get('name')).toEqual('new name');
    });

    test('MODEL_COMMON - Should NOT record history diff - HISTORY_ACTIVATED disabled', async () => {
        // Given
        process.env.HISTORY_ACTIVATED = 'false';

        const _id = new mongoose.Types.ObjectId();
        const oldDocument = {
            _id,
            name: 'name',
            description: 'test',
            createdAt: '2020-07-11T08:00:00.000Z'
        };

        const newDocument = {
            _id,
            name: 'new name',
            description: 'test',
            createdAt: '2020-07-11T08:00:00.000Z',
            updatedAt: '2020-07-12T08:00:00.000Z',
            updatedBy: 'Automated test'
        };

        const domainId = new mongoose.Types.ObjectId();
        const ignoredFields = ['_id', 'updatedAt'];
        const modifiedField = ['name'];

        // Test
        const result = await recordHistory(modifiedField, oldDocument, newDocument, domainId, ignoredFields);
        expect(result).toBeUndefined();
    });

    test('MODEL_COMMON - Should NOT record history diff - "name" key not identified in the modifiedField', async () => {
        // Given
        const _id = new mongoose.Types.ObjectId();
        const oldDocument = {
            _id,
            name: 'name',
            createdAt: '2020-07-11T08:00:00.000Z'
        };

        const newDocument = {
            _id,
            name: 'new name',
            createdAt: '2020-07-11T08:00:00.000Z',
            updatedAt: '2020-07-12T08:00:00.000Z',
            updatedBy: 'Automated test'
        };

        const domainId = new mongoose.Types.ObjectId();
        const ignoredFields = ['_id', 'updatedAt'];
        const modifiedField = ['description'];

        // Test
        const result = await recordHistory(modifiedField, oldDocument, newDocument, domainId, ignoredFields);
        expect(result).toBeUndefined();
    });

    test('MODEL_COMMON - Should NOT record history diff - "name" key identified in the ignoredFields', async () => {
        // Given
        const _id = new mongoose.Types.ObjectId();
        const oldDocument = {
            _id,
            name: 'name',
            createdAt: '2020-07-11T08:00:00.000Z'
        };

        const newDocument = {
            _id,
            name: 'new name',
            createdAt: '2020-07-11T08:00:00.000Z',
            updatedAt: '2020-07-12T08:00:00.000Z',
            updatedBy: 'Automated test'
        };

        const domainId = new mongoose.Types.ObjectId();
        const ignoredFields = ['_id', 'updatedAt', 'name'];
        const modifiedField = ['name'];

        // Test
        const result = await recordHistory(modifiedField, oldDocument, newDocument, domainId, ignoredFields);
        expect(result).toBeUndefined();
    });

    test('MODEL_COMMON - Should record history diff - "name" key removed', async () => {
        // Given
        const _id = new mongoose.Types.ObjectId();
        const oldDocument = {
            _id,
            name: 'name',
            createdAt: '2020-07-11T08:00:00.000Z'
        };

        const newDocument = {
            _id,
            createdAt: '2020-07-11T08:00:00.000Z',
            updatedAt: '2020-07-12T08:00:00.000Z',
            updatedBy: 'Automated test'
        };

        const domainId = new mongoose.Types.ObjectId();
        const ignoredFields = ['_id', 'updatedAt'];
        const modifiedField = ['name'];

        // Test
        const result = await recordHistory(modifiedField, oldDocument, newDocument, domainId, ignoredFields);
        expect(result).toEqual(
            expect.objectContaining({
                domainId,
                elementId: _id,
                oldValue: expect.any(Map),
                newValue: expect.any(Map),
                updatedBy: 'Automated test'
            })
        );

        expect(result.oldValue.get('name')).toEqual('name');
        expect(result.newValue.get('name')).toEqual('');
    });

    test('MODEL_COMMON - Should record history diff - "name" key added', async () => {
        // Given
        const _id = new mongoose.Types.ObjectId();
        const oldDocument = {
            _id,
            createdAt: '2020-07-11T08:00:00.000Z'
        };

        const newDocument = {
            _id,
            name: 'new name',
            createdAt: '2020-07-11T08:00:00.000Z',
            updatedAt: '2020-07-12T08:00:00.000Z',
            updatedBy: 'Automated test'
        };

        const domainId = new mongoose.Types.ObjectId();
        const ignoredFields = ['_id', 'updatedAt'];
        const modifiedField = ['name'];

        // Test
        const result = await recordHistory(modifiedField, oldDocument, newDocument, domainId, ignoredFields);
        expect(result).toEqual(
            expect.objectContaining({
                domainId,
                elementId: _id,
                oldValue: expect.any(Map),
                newValue: expect.any(Map),
                updatedBy: 'Automated test'
            })
        );

        expect(result.oldValue.get('name')).toEqual('');
        expect(result.newValue.get('name')).toEqual('new name');
    });

    test('MODEL_COMMON - Should NOT record history diff - "name" key removed and ignored', async () => {
        // Given
        const _id = new mongoose.Types.ObjectId();
        const oldDocument = {
            _id,
            name: 'name',
            createdAt: '2020-07-11T08:00:00.000Z'
        };

        const newDocument = {
            _id,
            createdAt: '2020-07-11T08:00:00.000Z',
            updatedAt: '2020-07-12T08:00:00.000Z',
            updatedBy: 'Automated test'
        };

        const domainId = new mongoose.Types.ObjectId();
        const ignoredFields = ['_id', 'updatedAt', 'name'];
        const modifiedField = ['name'];

        // Test
        const result = await recordHistory(modifiedField, oldDocument, newDocument, domainId, ignoredFields);
        expect(result).toBeUndefined();
    });

});