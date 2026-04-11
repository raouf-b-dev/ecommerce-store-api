import { ShippingAddressResolver } from './shipping-address-resolver';
import { ShippingAddressDto } from '../../../primary-adapters/dto/shipping-address.dto';
import { CustomerTestFactory } from '../../../../customers/testing/factories/customer.factory';
import { CheckoutCustomerInfo } from '../ports/customer.gateway';

/**
 * Helpers to build a CheckoutCustomerInfo from the customer test factory.
 */
function buildCheckoutCustomerInfo(
  overrides: Partial<
    ReturnType<typeof CustomerTestFactory.createCustomerWithAddress>
  > = {},
): CheckoutCustomerInfo {
  const raw = CustomerTestFactory.createCustomerWithAddress({
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    phone: '123-456-7890',
    ...overrides,
  });
  return {
    id: raw.id ?? null,
    firstName: raw.firstName,
    lastName: raw.lastName,
    email: raw.email,
    phone: raw.phone ?? null,
    addresses: (raw.addresses ?? []).map((a) => ({
      id: a.id ?? null,
      street: a.street,
      street2: a.street2 ?? null,
      city: a.city,
      state: a.state,
      postalCode: a.postalCode,
      country: a.country,
      isDefault: a.isDefault ?? false,
      deliveryInstructions: a.deliveryInstructions ?? null,
    })),
  };
}

describe('ShippingAddressResolver', () => {
  let resolver: ShippingAddressResolver;
  let mockCustomer: CheckoutCustomerInfo;

  beforeEach(() => {
    resolver = new ShippingAddressResolver();
    mockCustomer = buildCheckoutCustomerInfo({
      addresses: [
        CustomerTestFactory.createMockAddress({
          id: 10,
          customerId: 1,
          street: '123 Default St',
          street2: 'Apt 1',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'USA',
          isDefault: true,
          deliveryInstructions: 'Leave at door',
        }),
        CustomerTestFactory.createMockAddress({
          id: 11,
          customerId: 1,
          street: '456 Other St',
          street2: null,
          city: 'Los Angeles',
          state: 'CA',
          postalCode: '90001',
          country: 'USA',
          isDefault: false,
          deliveryInstructions: null,
        }),
      ],
    });
  });

  describe('resolveFromDto', () => {
    it('should build address from DTO with all fields provided', () => {
      const dto: ShippingAddressDto = {
        firstName: 'Jane',
        lastName: 'Smith',
        street: '789 Custom St',
        street2: 'Suite 200',
        city: 'Chicago',
        state: 'IL',
        postalCode: '60601',
        country: 'USA',
        phone: '555-555-5555',
        deliveryInstructions: 'Ring bell',
      };

      const result = resolver.resolveFromDto(dto, mockCustomer);

      expect(result).toEqual({
        id: 0,
        firstName: 'Jane',
        lastName: 'Smith',
        street: '789 Custom St',
        street2: 'Suite 200',
        city: 'Chicago',
        state: 'IL',
        postalCode: '60601',
        country: 'USA',
        phone: '555-555-5555',
        deliveryInstructions: 'Ring bell',
      });
    });

    it('should use customer defaults for missing firstName, lastName, phone', () => {
      const dto: ShippingAddressDto = {
        firstName: 'Jane',
        lastName: 'Smith',
        street: '789 Custom St',
        city: 'Chicago',
        state: 'IL',
        postalCode: '60601',
        country: 'USA',
      };

      const result = resolver.resolveFromDto(dto, mockCustomer);

      expect(result.firstName).toBe('Jane');
      expect(result.lastName).toBe('Smith');
      expect(result.phone).toBe('123-456-7890');
    });

    it('should set street2 and deliveryInstructions to null when not provided', () => {
      const dto: ShippingAddressDto = {
        firstName: 'Jane',
        lastName: 'Smith',
        street: '789 Custom St',
        city: 'Chicago',
        state: 'IL',
        postalCode: '60601',
        country: 'USA',
      };

      const result = resolver.resolveFromDto(dto, mockCustomer);

      expect(result.street2).toBeNull();
      expect(result.deliveryInstructions).toBeNull();
    });
  });

  describe('resolveFromDefault', () => {
    it('should return default address when customer has one', () => {
      const result = resolver.resolveFromDefault(mockCustomer);

      expect(result).toEqual({
        id: 10,
        firstName: 'John',
        lastName: 'Doe',
        street: '123 Default St',
        street2: 'Apt 1',
        city: 'New York',
        state: 'NY',
        postalCode: '10001',
        country: 'USA',
        phone: '123-456-7890',
        deliveryInstructions: 'Leave at door',
      });
    });

    it('should return null when customer has no default address', () => {
      const customerWithoutDefault: CheckoutCustomerInfo = {
        ...mockCustomer,
        addresses: [{ ...mockCustomer.addresses[0], isDefault: false }],
      };

      const result = resolver.resolveFromDefault(customerWithoutDefault);

      expect(result).toBeNull();
    });

    it('should return null when customer has no addresses', () => {
      const customerWithNoAddresses: CheckoutCustomerInfo = {
        ...mockCustomer,
        addresses: [],
      };

      const result = resolver.resolveFromDefault(customerWithNoAddresses);

      expect(result).toBeNull();
    });
  });

  describe('resolve', () => {
    it('should use DTO when provided', () => {
      const dto: ShippingAddressDto = {
        firstName: 'Jane',
        lastName: 'Smith',
        street: '789 Custom St',
        city: 'Chicago',
        state: 'IL',
        postalCode: '60601',
        country: 'USA',
      };

      const result = resolver.resolve(dto, mockCustomer);

      expect(result?.street).toBe('789 Custom St');
    });

    it('should fall back to default address when DTO is undefined', () => {
      const result = resolver.resolve(undefined, mockCustomer);

      expect(result?.street).toBe('123 Default St');
    });

    it('should return null when no DTO and no default address', () => {
      const customerWithoutDefault: CheckoutCustomerInfo = {
        ...mockCustomer,
        addresses: [],
      };

      const result = resolver.resolve(undefined, customerWithoutDefault);

      expect(result).toBeNull();
    });
  });
});
