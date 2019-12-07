import { 
    processOperation,
    StrategiesType,
    OperationsType
} from '../../src/models/config-strategy';

describe('Processing strategy: NETWORK', () => {

    const mock_values1 = [
        '10.0.0.0/30'
    ]

    const mock_values2 = [
        '10.0.0.0/30', '192.168.0.0/30'
    ]

    const mock_values3 = [
        '192.168.56.56',
        '192.168.56.57',
        '192.168.56.58'
    ]

    test('UNIT_STRATEGY_SUITE - Should agree when input range EXIST', async () => {
        const result = await processOperation(
            StrategiesType.NETWORK, OperationsType.EXIST, '10.0.0.3', mock_values1);
        expect(result).toBe(true);
    })

    test('UNIT_STRATEGY_SUITE - Should NOT agree when input range DOES NOT EXIST', async () => {
        const result = await processOperation(
            StrategiesType.NETWORK, OperationsType.EXIST, '10.0.0.4', mock_values1);
        expect(result).toBe(false);
    })

    test('UNIT_STRATEGY_SUITE - Should agree when input NOT_EXIST', async () => {
        const result = await processOperation(
            StrategiesType.NETWORK, OperationsType.NOT_EXIST, '10.0.0.4', mock_values1);
        expect(result).toBe(true);
    })

    test('UNIT_STRATEGY_SUITE - Should agree when input IP EXIST', async () => {
        const result = await processOperation(
            StrategiesType.NETWORK, OperationsType.EXIST, '192.168.56.58', mock_values3);
        expect(result).toBe(true);
    })

    test('UNIT_STRATEGY_SUITE - Should agree when input IP DOES NOT EXIST', async () => {
        const result = await processOperation(
            StrategiesType.NETWORK, OperationsType.NOT_EXIST, '192.168.56.50', mock_values3);
        expect(result).toBe(true);
    })

    test('UNIT_STRATEGY_SUITE - Should agree when input range EXIST for multiple ranges', async () => {
        const result = await processOperation(
            StrategiesType.NETWORK, OperationsType.EXIST, '192.168.0.3', mock_values2);
        expect(result).toBe(true);
    })

    test('UNIT_STRATEGY_SUITE - Should NOT agree when input range DOES NOT EXIST for multiple ranges', async () => {
        const result = await processOperation(
            StrategiesType.NETWORK, OperationsType.NOT_EXIST, '127.0.0.0', mock_values2);
        expect(result).toBe(true);
    })

})

describe('Processing strategy: VALUE', () => {
    const mock_values1 = [
        'USER_1'
    ]

    const mock_values2 = [
        'USER_1', 'USER_2'
    ]

    test('UNIT_STRATEGY_SUITE - Should agree when input EXIST', () => {
        const result = processOperation(
            StrategiesType.VALUE, OperationsType.EXIST, 'USER_1', mock_values1);
        expect(result).toBe(true);
    })

    test('UNIT_STRATEGY_SUITE - Should NOT agree when input DOES NOT EXIST', () => {
        const result = processOperation(
            StrategiesType.VALUE, OperationsType.EXIST, 'USER_123', mock_values1);
        expect(result).toBe(false);
    })

    test('UNIT_STRATEGY_SUITE - Should agree when input DOES NOT EXIST', () => {
        const result = processOperation(
            StrategiesType.VALUE, OperationsType.NOT_EXIST, 'USER_123', mock_values1);
        expect(result).toBe(true);
    })

    test('UNIT_STRATEGY_SUITE - Should agree when input is EQUAL', () => {
        const result = processOperation(
            StrategiesType.VALUE, OperationsType.EQUAL, 'USER_1', mock_values1);
        expect(result).toBe(true);
    })

    test('UNIT_STRATEGY_SUITE - Should NOT agree when input is NOT EQUAL', () => {
        const result = processOperation(
            StrategiesType.VALUE, OperationsType.EQUAL, 'USER_2', mock_values1);
        expect(result).toBe(false);
    })

    test('UNIT_STRATEGY_SUITE - Should agree when input is NOT EQUAL', () => {
        const result = processOperation(
            StrategiesType.VALUE, OperationsType.NOT_EQUAL, 'USER_123', mock_values2);
        expect(result).toBe(true);
    })

    test('UNIT_STRATEGY_SUITE - Should NOT agree when input is NOT EQUAL', () => {
        const result = processOperation(
            StrategiesType.VALUE, OperationsType.NOT_EQUAL, 'USER_2', mock_values2);
        expect(result).toBe(false);
    })
})

describe('Processing strategy: TIME', () => {
    const mock_values1 = [
        '08:00'
    ]

    const mock_values2 = [
        '08:00', '10:00'
    ]

    test('UNIT_STRATEGY_SUITE - Should agree when input is LOWER', () => {
        const result = processOperation(
            StrategiesType.TIME, OperationsType.LOWER, '06:00', mock_values1);
        expect(result).toBe(true);
    })

    test('UNIT_STRATEGY_SUITE - Should agree when input is LOWER or SAME', () => {
        const result = processOperation(
            StrategiesType.TIME, OperationsType.LOWER, '08:00', mock_values1);
        expect(result).toBe(true);
    })

    test('UNIT_STRATEGY_SUITE - Should NOT agree when input is NOT LOWER', () => {
        const result = processOperation(
            StrategiesType.TIME, OperationsType.LOWER, '10:00', mock_values1);
        expect(result).toBe(false);
    })

    test('UNIT_STRATEGY_SUITE - Should agree when input is GREATER', () => {
        const result = processOperation(
            StrategiesType.TIME, OperationsType.GREATER, '10:00', mock_values1);
        expect(result).toBe(true);
    })

    test('UNIT_STRATEGY_SUITE - Should agree when input is GREATER or SAME', () => {
        const result = processOperation(
            StrategiesType.TIME, OperationsType.GREATER, '08:00', mock_values1);
        expect(result).toBe(true);
    })

    test('UNIT_STRATEGY_SUITE - Should NOT agree when input is NOT GREATER', () => {
        const result = processOperation(
            StrategiesType.TIME, OperationsType.GREATER, '06:00', mock_values1);
        expect(result).toBe(false);
    })

    test('UNIT_STRATEGY_SUITE - Should agree when input is in BETWEEN', () => {
        const result = processOperation(
            StrategiesType.TIME, OperationsType.BETWEEN, '09:00', mock_values2);
        expect(result).toBe(true);
    })

    test('UNIT_STRATEGY_SUITE - Should NOT agree when input is NOT in BETWEEN', () => {
        const result = processOperation(
            StrategiesType.TIME, OperationsType.BETWEEN, '07:00', mock_values2);
        expect(result).toBe(false);
    })
})

describe('Processing strategy: DATE', () => {
    const mock_values1 = [
        '2019-12-01'
    ]

    const mock_values2 = [
        '2019-12-01', '2019-12-05'
    ]

    const mock_values3 = [
        '2019-12-01T08:30'
    ]

    test('UNIT_STRATEGY_SUITE - Should agree when input is LOWER', () => {
        const result = processOperation(
            StrategiesType.DATE, OperationsType.LOWER, '2019-11-26', mock_values1);
        expect(result).toBe(true);
    })

    test('UNIT_STRATEGY_SUITE - Should agree when input is LOWER or SAME', () => {
        const result = processOperation(
            StrategiesType.DATE, OperationsType.LOWER, '2019-12-01', mock_values1);
        expect(result).toBe(true);
    })

    test('UNIT_STRATEGY_SUITE - Should NOT agree when input is NOT LOWER', () => {
        const result = processOperation(
            StrategiesType.DATE, OperationsType.LOWER, '2019-12-02', mock_values1);
        expect(result).toBe(false);
    })

    test('UNIT_STRATEGY_SUITE - Should agree when input is GREATER', () => {
        const result = processOperation(
            StrategiesType.DATE, OperationsType.GREATER, '2019-12-02', mock_values1);
        expect(result).toBe(true);
    })

    test('UNIT_STRATEGY_SUITE - Should agree when input is GREATER or SAME', () => {
        const result = processOperation(
            StrategiesType.DATE, OperationsType.GREATER, '2019-12-01', mock_values1);
        expect(result).toBe(true);
    })

    test('UNIT_STRATEGY_SUITE - Should NOT agree when input is NOT GREATER', () => {
        const result = processOperation(
            StrategiesType.DATE, OperationsType.GREATER, '2019-11-10', mock_values1);
        expect(result).toBe(false);
    })

    test('UNIT_STRATEGY_SUITE - Should agree when input is in BETWEEN', () => {
        const result = processOperation(
            StrategiesType.DATE, OperationsType.BETWEEN, '2019-12-03', mock_values2);
        expect(result).toBe(true);
    })

    test('UNIT_STRATEGY_SUITE - Should NOT agree when input is NOT in BETWEEN', () => {
        const result = processOperation(
            StrategiesType.DATE, OperationsType.BETWEEN, '2019-12-12', mock_values2);
        expect(result).toBe(false);
    })

    test('UNIT_STRATEGY_SUITE - Should agree when input is LOWER including time', () => {
        const result = processOperation(
            StrategiesType.DATE, OperationsType.LOWER, '2019-12-01T07:00', mock_values3);
        expect(result).toBe(true);
    })

    test('UNIT_STRATEGY_SUITE - Should NOT agree when input is NOT LOWER including time', () => {
        const result = processOperation(
            StrategiesType.DATE, OperationsType.LOWER, '2019-12-01T07:00', mock_values1);
        expect(result).toBe(false);
    })

    test('UNIT_STRATEGY_SUITE - Should agree when input is GREATER including time', () => {
        const result = processOperation(
            StrategiesType.DATE, OperationsType.GREATER, '2019-12-01T08:40', mock_values3);
        expect(result).toBe(true);
    })
})