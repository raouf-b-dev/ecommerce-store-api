import { requireMinorUnits } from './decimal-money.util';

describe('requireMinorUnits', () => {
  it('converts a valid decimal string or number to minor units', () => {
    expect(requireMinorUnits('19.99')).toBe(1999);
    expect(requireMinorUnits(19.99)).toBe(1999);
    expect(requireMinorUnits('0.00')).toBe(0);
    expect(requireMinorUnits(0)).toBe(0);
  });

  it('throws an Error when the value cannot be represented as minor units', () => {
    expect(() => requireMinorUnits('invalid')).toThrow(
      'Invalid money amount "invalid"',
    );
    expect(() => requireMinorUnits('-5.00')).toThrow(
      'Invalid money amount "-5.00"',
    );
    expect(() => requireMinorUnits(Number.NaN)).toThrow(
      'Invalid money amount "NaN"',
    );
  });
});
