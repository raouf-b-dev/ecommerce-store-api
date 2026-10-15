import { requireMinorUnits } from './decimal-money.util';

describe('requireMinorUnits', () => {
  it('converts a valid decimal string or number to minor units', () => {
    expect(requireMinorUnits('19.99', 'USD')).toBe(1999);
    expect(requireMinorUnits(19.99, 'USD')).toBe(1999);
    expect(requireMinorUnits('0.00', 'USD')).toBe(0);
    expect(requireMinorUnits(0, 'USD')).toBe(0);
    expect(requireMinorUnits('1000', 'JPY')).toBe(1000);
    expect(requireMinorUnits('1.234', 'KWD')).toBe(1234);
  });

  it('throws an Error when the value cannot be represented as minor units', () => {
    expect(() => requireMinorUnits('invalid', 'USD')).toThrow(
      'Invalid money amount "invalid" for currency "USD"',
    );
    expect(() => requireMinorUnits('-5.00', 'USD')).toThrow(
      'Invalid money amount "-5.00" for currency "USD"',
    );
    expect(() => requireMinorUnits(Number.NaN, 'USD')).toThrow(
      'Invalid money amount "NaN" for currency "USD"',
    );
    expect(() => requireMinorUnits('19.999', 'USD')).toThrow(
      'Invalid money amount "19.999" for currency "USD"',
    );
  });
});
