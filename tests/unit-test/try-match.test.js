import TimedMatch from '../../src/helpers/timed-match';

describe('Test tryMatch', () => {

    const evilRE = '^(([a-z])+.)+[A-Z]([a-z])+$';
    const evilInput1 = 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
    const evilInput2 = 'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';

    beforeEach(() => {
        TimedMatch.setMaxBlackListed(50);
        TimedMatch.setMaxTimeLimit(3000);
        TimedMatch.clearBlackList();
    });

    test('UNIT_TRY_MATCH - Should match value', async () => {
        const result = await TimedMatch.tryMatch(['USER_[0-9]{1,2}'], 'USER_1');
        expect(result).toBe(true);
    });

    test('UNIT_TRY_MATCH - Should fail for reDoS attempt - default 3000 ms', async () => {
        let timer = Date.now();
        const result = await TimedMatch.tryMatch([evilRE], evilInput1);
        timer = Date.now() - timer;

        expect(timer).not.toBeLessThan(3000);
        expect(result).toBe(false);
    });

    test('UNIT_TRY_MATCH - Should fail for reDoS attempt - 2000 ms', async () => {
        TimedMatch.setMaxTimeLimit(2000);

        let timer = Date.now();
        const result = await TimedMatch.tryMatch([evilRE], evilInput1);
        timer = Date.now() - timer;

        expect(timer).not.toBeLessThan(2000);
        expect(timer).not.toBeGreaterThan(2500);
        expect(result).toBe(false);
    });

    test('UNIT_TRY_MATCH - Should return from black list after fail to perfom match', async () => {
        TimedMatch.setMaxTimeLimit(1000);
        let timer, result;

        timer = Date.now();
        result = await TimedMatch.tryMatch([evilRE], evilInput1);
        timer = Date.now() - timer;

        expect(timer).not.toBeLessThan(1000);
        expect(timer).not.toBeGreaterThan(1500);
        expect(result).toBe(false);

        timer = Date.now();
        result = await TimedMatch.tryMatch([evilRE], evilInput1);
        timer = Date.now() - timer;

        expect(timer).not.toBeGreaterThan(100);
        expect(result).toBe(false);
    });

    test('UNIT_TRY_MATCH - Should replace black listed failed match', async () => {
        TimedMatch.setMaxTimeLimit(500);
        TimedMatch.setMaxBlackListed(1);
        let timer, result;

        timer = Date.now();
        result = await TimedMatch.tryMatch([evilRE], evilInput1);
        timer = Date.now() - timer;

        expect(timer).not.toBeLessThan(500);
        expect(timer).not.toBeGreaterThan(1000);
        expect(result).toBe(false);

        timer = Date.now();
        result = await TimedMatch.tryMatch([evilRE], evilInput2);
        timer = Date.now() - timer;

        expect(timer).not.toBeLessThan(500);
        expect(timer).not.toBeGreaterThan(1000);
        expect(result).toBe(false);

        timer = Date.now();
        result = await TimedMatch.tryMatch([evilRE], evilInput2);
        timer = Date.now() - timer;

        expect(timer).not.toBeGreaterThan(100);
        expect(result).toBe(false);
    });

});