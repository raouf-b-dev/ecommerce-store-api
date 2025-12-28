import { ShippingAddressResolver } from './shipping-address-resolver';
import { ShippingAddressDto } from '../../presentation/dto/shipping-address.dto';
import { ICustomer } from '../../../customers/domain/interfaces/customer.interface';
import { CustomerTestFactory } from '../../../customers/testing/factories/customer.factory';

describe('ShippingAddressResolver', () => {
  let resolver: ShippingAddressResolver;
  let mockCustomer: ICustomer;

  beforeEach(() => {
    resolver = new ShippingAddressResolver();
    mockCustomer = CustomerTestFactory.createCustomerWithAddress({
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      phone: '123-456-7890',
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

      // firstName and lastName come from DTO (required fields)
      expect(result.firstName).toBe('Jane');
      expect(result.lastName).toBe('Smith');
      // phone falls back to customer
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
      const customerWithoutDefault = CustomerTestFactory.createMockCustomer({
        addresses: [
          CustomerTestFactory.createMockAddress({
            id: 11,
            isDefault: false,
          }),
        ],
      });

      const result = resolver.resolveFromDefault(customerWithoutDefault);

      expect(result).toBeNull();
    });

    it('should return null when customer has no addresses', () => {
      const customerWithNoAddresses = CustomerTestFactory.createMockCustomer({
        addresses: [],
      });

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
      const customerWithoutDefault = CustomerTestFactory.createMockCustomer({
        addresses: [],
      });

      const result = resolver.resolve(undefined, customerWithoutDefault);

      expect(result).toBeNull();
    });
  });
});
