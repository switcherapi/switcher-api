require('../../src/db/mongoose');

import mongoose from 'mongoose';
import { getHistory, deleteHistory } from '../../src/services/history';
import { 
    setupDatabase,
    addHistory,
    domainId,
    element1Id,
    element2Id
} from '../fixtures/db_history';

afterAll(async () => { 
    await new Promise(resolve => setTimeout(resolve, 1000));
    await mongoose.disconnect();
});

describe('Testing history services', () => {
    beforeEach(setupDatabase);

    test('HISTORY_SERVICE - Should get history', async () => {
        // given
        const timestamp = Date.now();
        await addHistory(domainId, element1Id, { value: 1 }, { value: 2 }, timestamp);

        // test
        const history = await getHistory('oldValue newValue updatedBy', domainId, element1Id);
        expect(history[0].toJSON()).toEqual(
            expect.objectContaining({
                oldValue: { value: 1 },
                newValue: { value: 2 },
                updatedBy: 'FIXTURE'
            })
        );
    });

    test('HISTORY_SERVICE - Should get history - single entry', async () => {
        // given
        const timestamp = Date.now();
        await addHistory(domainId, element1Id, { value: 1 }, { value: 2 }, timestamp);
        await addHistory(domainId, element1Id, { value: 2 }, { value: 3 }, timestamp);
        await addHistory(domainId, element2Id, { value: 4 }, { value: 5 }, timestamp);

        // test
        const history = await getHistory('elementId', domainId, element1Id, {
            limit: 1
        });

        expect(history.length).toBe(1);
        expect(history[0].elementId).toMatchObject(element1Id);
    });

    test('HISTORY_SERVICE - Should NOT get history - invalid paging args - limit', async () => {
        const call = async () => {
            await getHistory('elementId', domainId, element1Id, {
                limit: '0'
            });
        }; 

        await expect(call()).rejects.toThrowError('Invalid paging args');
    });

    test('HISTORY_SERVICE - Should NOT get history - invalid paging args - limit not number', async () => {
        const call = async () => {
            await getHistory('elementId', domainId, element1Id, {
                limit: 'a'
            });
        }; 

        await expect(call()).rejects.toThrowError('Invalid paging args');
    });

    test('HISTORY_SERVICE - Should NOT get history - invalid paging args - skip', async () => {
        const call = async () => {
            await getHistory('elementId', domainId, element1Id, {
                skip: '-1'
            });
        }; 

        await expect(call()).rejects.toThrowError('Invalid paging args');
    });

    test('HISTORY_SERVICE - Should NOT get history - invalid paging args - skip not number', async () => {
        const call = async () => {
            await getHistory('elementId', domainId, element1Id, {
                skip: 'a'
            });
        }; 

        await expect(call()).rejects.toThrowError('Invalid paging args');
    });

    test('HISTORY_SERVICE - Should get history - skip first entry', async () => {
        // given
        const timestamp = Date.now();
        await addHistory(domainId, element1Id, { value: 1 }, { value: 2 }, timestamp);
        await addHistory(domainId, element1Id, { value: 3 }, { value: 4 }, timestamp);

        // test
        const history = await getHistory('oldValue', domainId, element1Id, {
            skip: 1
        });

        expect(history[0].oldValue.toJSON()).toMatchObject({ value: 3 });
    });

    test('HISTORY_SERVICE - Should get history entries sorted by asc', async () => {
        // given
        const timestamp = Date.now();
        await addHistory(domainId, element1Id, { value: 1 }, { value: 2 }, timestamp);
        await addHistory(domainId, element1Id, { value: 3 }, { value: 4 }, timestamp);

        // test
        const history = await getHistory('oldValue', domainId, element1Id, {
            sortBy: 'oldValue:asc'
        });

        expect(history[0].oldValue.toJSON()).toMatchObject({ value: 1 });
    });

    test('HISTORY_SERVICE - Should NOT get history entries sorted - invalid sortBy query spec', async () => {
        const call = async () => {
            await getHistory('elementId', domainId, element1Id, {
                sortBy: 'oldValue:ASC'
            });
        }; 

        await expect(call()).rejects.toThrowError('Invalid paging args');
    });

    test('HISTORY_SERVICE - Should NOT get history entries sorted - invalid sortBy query spec #2', async () => {
        const call = async () => {
            await getHistory('elementId', domainId, element1Id, {
                sortBy: 'oldValue'
            });
        }; 

        await expect(call()).rejects.toThrowError('Invalid paging args');
    });

    test('HISTORY_SERVICE - Should NOT get history entries sorted - invalid sortBy query argument', async () => {
        // given
        const timestamp = Date.now();
        await addHistory(domainId, element1Id, { value: 1 }, { value: 2 }, timestamp);
        await addHistory(domainId, element1Id, { value: 3 }, { value: 4 }, timestamp);
        
        // test
        const call = async () => {
            await getHistory('elementId', domainId, element1Id, {
                sortBy: 'oldValue&:asc'
            });
        }; 

        await expect(call()).rejects.toThrowError('Invalid paging args');
    });

    test('HISTORY_SERVICE - Should get history entries sorted by desc', async () => {
        // given
        const timestamp = Date.now();
        await addHistory(domainId, element1Id, { value: 1 }, { value: 2 }, timestamp);
        await addHistory(domainId, element1Id, { value: 3 }, { value: 4 }, timestamp);

        // test
        const history = await getHistory('oldValue', domainId, element1Id, {
            sortBy: 'oldValue:desc'
        });

        expect(history[0].oldValue.toJSON()).toMatchObject({ value: 3 });
    });

    test('HISTORY_SERVICE - Should delete element history entries', async () => {
        // given
        const timestamp = Date.now();
        await addHistory(domainId, element1Id, { value: 1 }, { value: 2 }, timestamp);
        await addHistory(domainId, element1Id, { value: 3 }, { value: 4 }, timestamp);

        // that
        let history = await getHistory('oldValue', domainId, element1Id);
        expect(history.length).toBe(2);
        
        // test
        await deleteHistory(domainId, element1Id);
        history = await getHistory('oldValue', domainId, element1Id);
        expect(history.length).toBe(0);
    });

});