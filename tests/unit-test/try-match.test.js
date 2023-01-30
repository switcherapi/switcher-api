import tryMatch from '../../src/helpers/timed-match/try-match';

describe('Test tryMatch', () => {

    test('UNIT_TRY_MATCH - Should match value', async () => {
        const result = await tryMatch(['USER_[0-9]{1,2}'], 'USER_1');
        expect(result).toBe(true);
    });

    test('UNIT_TRY_MATCH - Should fail for reDoS attempt - default 3000 ms', async () => {
        let timer = Date.now();
        const result = await tryMatch(['^(([a-z])+.)+[A-Z]([a-z])+$'], 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa');
        timer = Date.now() - timer;

        expect(timer).not.toBeLessThan(3000);
        expect(result).toBe(false);
    });

    test('UNIT_TRY_MATCH - Should fail for reDoS attempt - 2000 ms', async () => {
        let timer = Date.now();
        const result = await tryMatch(['^(([a-z])+.)+[A-Z]([a-z])+$'], 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa', 2000);
        timer = Date.now() - timer;

        expect(timer).not.toBeLessThan(2000);
        expect(timer).not.toBeGreaterThan(2500);
        expect(result).toBe(false);
    });

});