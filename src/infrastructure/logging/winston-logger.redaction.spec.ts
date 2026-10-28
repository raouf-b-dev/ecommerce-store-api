import { redactInPlace } from './winston-logger.service';

describe('log redaction', () => {
  it('redacts customer personal data and credentials, nested included', () => {
    const info = {
      message: 'order event',
      orderId: 7,
      password: 'secret-value',
      customer: {
        userId: 2,
        email: 'jane@example.com',
        firstName: 'Jane',
        lastName: 'Doe',
        phone: '+1 555 0100',
        shippingAddress: { street: '1 Main St', postalCode: '12345' },
      },
      items: [{ userEmail: 'jane@example.com', quantity: 1 }],
    };

    redactInPlace(info);

    expect(info).toEqual({
      message: 'order event',
      orderId: 7,
      password: '[REDACTED]',
      customer: {
        userId: 2,
        email: '[REDACTED]',
        firstName: '[REDACTED]',
        lastName: '[REDACTED]',
        phone: '[REDACTED]',
        shippingAddress: '[REDACTED]',
      },
      items: [{ userEmail: '[REDACTED]', quantity: 1 }],
    });
  });
});
