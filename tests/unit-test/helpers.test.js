import { formatInput, containsValue } from '../../src/helpers';

describe('Test formatInput', () => {

  test('Should return error - Non alphanumeric input', () => {
    try {
      formatInput('Spaces are not allowed here');
    } catch (e) {
      expect(e.message).toBe('Invalid input format. Use only alphanumeric digits.');
    }
  });

  test('Should NOT return error - Spaces allowed', () => {
    try {
      const input = formatInput('Spaces are not allowed here', { allowSpace: true });
      expect(input).toBe('Spaces are not allowed here');
    } catch (e) {
      expect(e.message).toBe(null);
    }
  });

  test('Should format input - To upper case', () => {
      const input = formatInput('uppercaseme', { toUpper: true });
      expect(input).toBe('UPPERCASEME');
  });

  test('Should format input - To lower case', () => {
    const input = formatInput('UPPERCASEME', { toLower: true });
    expect(input).toBe('uppercaseme');
  });

  test('Should format input - Replace spaces for underscore', () => {
    const input = formatInput('NEW SCORE', { autoUnderscore: true });
    expect(input).toBe('NEW_SCORE');
  });

});

describe('Test containsValue', () => {

  test('Should return true when value exists in array', () => {
    const result = containsValue(['value1', 'value2'], 'value1');
    expect(result).toBeTruthy();
  });

  test('Should return false when value does not exist in array', () => {
    const result = containsValue(['value1', 'value2'], 'value3');
    expect(result).toBeFalsy();
  });

  test('Should return true when partial value exists in array', () => {
    const result = containsValue(['value1', 'value2'], 'value');
    expect(result).toBeTruthy();
  });

  test('Should return false for case sensitive values', () => {
    const result = containsValue(['value1', 'value2'], 'Value1');
    expect(result).toBeFalsy();
  });

  test('Should return false when array is empty', () => {
    const result = containsValue([], 'value1');
    expect(result).toBeFalsy();
  });

  test('Should return false when array is undefined', () => {
    const result = containsValue(undefined, 'value1');
    expect(result).toBeFalsy();
  });

});