import { ShippingAddress } from './shipping-address';
import { OrderTestFactory } from 'src/modules/orders/testing';

describe('ShippingAddress', () => {
  describe('construction', () => {
    it('creates address from valid props', () => {
      const props = OrderTestFactory.createShippingAddressProps();

      const address = new ShippingAddress(props);

      expect(address.firstName).toBe('John');
      expect(address.country).toBe('dz');
    });

    it.each([
      'firstName',
      'lastName',
      'street',
      'city',
      'state',
      'postalCode',
      'country',
    ] as const)('throws when %s is empty', (field) => {
      const props = OrderTestFactory.createShippingAddressProps({
        [field]: '   ',
      });

      expect(() => new ShippingAddress(props)).toThrow(`${field} is required`);
    });
  });

  describe('postal code validation', () => {
    it.each(['10001', 'SW1A 1AA', '75001-1234'])(
      'accepts valid postal code %s',
      (postalCode) => {
        const address = new ShippingAddress(
          OrderTestFactory.createShippingAddressProps({ postalCode }),
        );

        expect(address.postalCode).toBe(postalCode);
      },
    );

    it.each(['AB', '!!!'])('rejects invalid postal code %s', (postalCode) => {
      expect(
        () =>
          new ShippingAddress(
            OrderTestFactory.createShippingAddressProps({ postalCode }),
          ),
      ).toThrow('Invalid postal code format');
    });
  });

  describe('country whitelist', () => {
    it.each(['us', 'ca', 'gb', 'dz', 'US'])('accepts country %s', (country) => {
      const address = new ShippingAddress(
        OrderTestFactory.createShippingAddressProps({ country }),
      );

      expect(address.country).toBe(country.toLowerCase());
    });

    it('rejects unsupported country', () => {
      expect(
        () =>
          new ShippingAddress(
            OrderTestFactory.createShippingAddressProps({ country: 'xx' }),
          ),
      ).toThrow('Unsupported country: xx');
    });
  });

  describe('phone validation', () => {
    it.each(['+1234567890', '1234567890', '+1 (555) 123-4567'])(
      'accepts valid phone %s',
      (phone) => {
        const address = new ShippingAddress(
          OrderTestFactory.createShippingAddressProps({ phone }),
        );

        expect(address.phone).toBe(phone.trim());
      },
    );

    it('rejects invalid phone format', () => {
      expect(
        () =>
          new ShippingAddress(
            OrderTestFactory.createShippingAddressProps({ phone: 'abc' }),
          ),
      ).toThrow('Invalid phone number format');
    });

    it('allows null phone', () => {
      const address = new ShippingAddress(
        OrderTestFactory.createShippingAddressProps({ phone: null }),
      );

      expect(address.phone).toBeNull();
    });
  });

  describe('normalization', () => {
    it('trims string fields and lowercases country', () => {
      const address = new ShippingAddress(
        OrderTestFactory.createShippingAddressProps({
          firstName: '  Jane  ',
          lastName: '  Smith  ',
          street: '  456 Oak Ave  ',
          street2: '  Apt 2  ',
          city: '  Boston  ',
          state: '  MA  ',
          postalCode: ' 02101 ',
          country: ' US ',
          phone: ' +15551234567 ',
          deliveryInstructions: '  Leave at door  ',
        }),
      );

      expect(address.firstName).toBe('Jane');
      expect(address.lastName).toBe('Smith');
      expect(address.street).toBe('456 Oak Ave');
      expect(address.street2).toBe('Apt 2');
      expect(address.city).toBe('Boston');
      expect(address.state).toBe('MA');
      expect(address.postalCode).toBe('02101');
      expect(address.country).toBe('us');
      expect(address.phone).toBe('+15551234567');
      expect(address.deliveryInstructions).toBe('Leave at door');
    });

    it('normalizes empty optional fields to null', () => {
      const address = new ShippingAddress(
        OrderTestFactory.createShippingAddressProps({
          street2: '',
          phone: '',
          deliveryInstructions: '',
        }),
      );

      expect(address.street2).toBeNull();
      expect(address.phone).toBeNull();
      expect(address.deliveryInstructions).toBeNull();
    });
  });

  describe('getFormattedAddress', () => {
    it('includes name, lines, country, and phone', () => {
      const address = new ShippingAddress(
        OrderTestFactory.createShippingAddressProps(),
      );

      const formatted = address.getFormattedAddress();

      expect(formatted).toContain('John Doe');
      expect(formatted).toContain('123 Main Street');
      expect(formatted).toContain('New York, NY 10001');
      expect(formatted).toContain('DZ');
      expect(formatted).toContain('Phone: +1234567890');
    });
  });

  describe('equals and serialization', () => {
    it('equals compares normalized field values', () => {
      const props = OrderTestFactory.createShippingAddressProps();
      const a = new ShippingAddress(props);
      const b = ShippingAddress.fromPrimitives(props);

      expect(a.equals(b)).toBe(true);
    });

    it('round-trips through toPrimitives and fromPrimitives', () => {
      const original = new ShippingAddress(
        OrderTestFactory.createShippingAddressProps(),
      );

      const restored = ShippingAddress.fromPrimitives(original.toPrimitives());

      expect(restored.equals(original)).toBe(true);
    });
  });
});
