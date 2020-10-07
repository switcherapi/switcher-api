const { formatInput } = require('../../src/routers/common');

describe('Test formatInput', () => {

  test('UNIT_ROUTER_INDEX - Should return error - Non alphanumeric input', () => {
    try {
      formatInput('Spaces are not allowed here');
    } catch (e) {
      expect(e.message).toBe('Invalid input format. Use only alphanumeric digits.');
    }
  });

  test('UNIT_ROUTER_INDEX - Should NOT return error - Spaces allowed', () => {
    try {
      const input = formatInput('Spaces are not allowed here', { allowSpace: true });
      expect(input).toBe('Spaces are not allowed here');
    } catch (e) {
      expect(e.message).toBe(null);
    }
  });

  test('UNIT_ROUTER_INDEX - Should format input - To upper case', () => {
      const input = formatInput('uppercaseme', { toUpper: true });
      expect(input).toBe('UPPERCASEME');
  });

  test('UNIT_ROUTER_INDEX - Should format input - To lower case', () => {
    const input = formatInput('UPPERCASEME', { toLower: true });
    expect(input).toBe('uppercaseme');
  });

  test('UNIT_ROUTER_INDEX - Should format input - Replace spaces for underscore', () => {
    const input = formatInput('NEW SCORE', { autoUnderscore: true });
    expect(input).toBe('NEW_SCORE');
  });

});