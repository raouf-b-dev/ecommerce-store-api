import { PaymentMethod, PaymentMethodType } from './payment-method';
import { DomainError } from '../exceptions/domain.error';

describe('PaymentMethod', () => {
  it('creates valid PaymentMethod with CARD', () => {
    const pm = new PaymentMethod(PaymentMethodType.CARD);
    expect(pm.type).toBe(PaymentMethodType.CARD);
    expect(pm.toString()).toBe('CARD');
  });

  it('checks equality with another PaymentMethod', () => {
    const pm1 = new PaymentMethod(PaymentMethodType.CARD);
    const pm2 = new PaymentMethod(PaymentMethodType.CARD);
    expect(pm1.equals(pm2)).toBe(true);
  });

  it('throws DomainError when invalid payment method type is passed', () => {
    expect(() => {
      Reflect.construct(PaymentMethod, ['INVALID']);
    }).toThrow(DomainError);
    expect(() => {
      Reflect.construct(PaymentMethod, ['INVALID']);
    }).toThrow('Invalid payment method: INVALID');
  });
});
