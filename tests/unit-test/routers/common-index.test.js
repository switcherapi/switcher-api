import { getFields } from '../../../src/routers/common/index.js';

/* Fixtures */

const switcherActivated = new Map();
switcherActivated.set('default', true);

const relayActivated = new Map();
relayActivated.set('default', true);
relayActivated.set('staging', false);

const config1 = {
    key: 'SWITCHER_KEY_1',
    description: '[description]',
    activated: switcherActivated,
    relay: {
        description: '[relay description]',
        activated: relayActivated
    }
};

const config2 = {
    key: 'SWITCHER_KEY_2',
    description: '[description]',
    activated: switcherActivated
};

/* Tests */

describe('Helper: Router::common::getFields', () => {
    test('Should return the fields from the object', () => {
        const result = getFields([config1], 'key,activated.default,relay.activated.default');
        expect(result).toEqual([{
            key: 'SWITCHER_KEY_1',
            activated: {
                default: true
            },
            relay: {
                activated: {
                    default: true
                }
            }
        }]);
    });

    test('Should return the fields from the object - with non-existing field path', () => {
        const result = getFields([config2], 'key,relay.activated.default');
        expect(result).toEqual([{
            key: 'SWITCHER_KEY_2',
            relay: {
                activated: {}
            }
        }]);
    });
});