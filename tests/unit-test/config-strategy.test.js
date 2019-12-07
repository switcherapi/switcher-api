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

})

describe('Processing strategy: TIME', () => {

})

describe('Processing strategy: DATE', () => {

})

describe('Processing strategy: LOCATION', () => {

})