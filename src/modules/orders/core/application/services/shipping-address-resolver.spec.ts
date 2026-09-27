import { ShippingAddressResolver } from './shipping-address-resolver';
import { CheckoutUserInfoResult } from '../ports/user.gateway';
import { OrderDtoTestFactory } from 'src/modules/orders/testing';

describe('ShippingAddressResolver', () => {
  let resolver: ShippingAddressResolver;
  let mockUser: CheckoutUserInfoResult;

  beforeEach(() => {
    resolver = new ShippingAddressResolver();
    mockUser = OrderDtoTestFactory.createCheckoutUserInfoResult({
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john@example.com',
      phone: '123-456-7890',
      addresses: [
        OrderDtoTestFactory.createCheckoutUserAddress({
          id: 10,
          street: '123 Default St',
          street2: 'Apt 1',
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'USA',
          isDefault: true,
          deliveryInstructions: 'Leave at door',
        }),
        OrderDtoTestFactory.createCheckoutUserAddress({
          id: 11,
          street: '456 Other St',
          street2: undefined,
          city: 'Los Angeles',
          state: 'CA',
          postalCode: '90001',
          country: 'USA',
          isDefault: false,
          deliveryInstructions: undefined,
        }),
      ],
    });
  });

  describe('resolveFromDto', () => {
    it('should resolve shipping address from explicit input DTO', () => {
      const inputDto = OrderDtoTestFactory.createCheckoutShippingAddressInput({
        firstName: 'Explicit',
        lastName: 'User',
        street: '789 Explicit Rd',
        city: 'Chicago',
        state: 'IL',
        postalCode: '60601',
        country: 'USA',
        phone: '999-888-7777',
      });

      const result = resolver.resolveFromDto(inputDto, mockUser);

      expect(result).toEqual({
        id: 0,
        firstName: 'Explicit',
        lastName: 'User',
        street: '789 Explicit Rd',
        street2: null,
        city: 'Chicago',
        state: 'IL',
        postalCode: '60601',
        country: 'USA',
        phone: '999-888-7777',
        deliveryInstructions: null,
      });
    });
  });

  describe('resolveFromDefault', () => {
    it('should resolve default address when available', () => {
      const result = resolver.resolveFromDefault(mockUser);

      expect(result).toBeDefined();
      expect(result?.street).toBe('123 Default St');
      expect(result?.firstName).toBe('John');
      expect(result?.lastName).toBe('Doe');
    });

    it('should return null when user has no default address', () => {
      const userWithoutDefault =
        OrderDtoTestFactory.createCheckoutUserInfoResult({
          ...mockUser,
          addresses: mockUser.addresses.map((a) => ({
            ...a,
            isDefault: false,
          })),
        });

      const result = resolver.resolveFromDefault(userWithoutDefault);

      expect(result).toBeNull();
    });
  });

  describe('resolve', () => {
    it('should use explicit DTO when provided', () => {
      const inputDto = OrderDtoTestFactory.createCheckoutShippingAddressInput({
        street: '789 Explicit Rd',
        city: 'Chicago',
        state: 'IL',
        postalCode: '60601',
        country: 'USA',
      });

      const result = resolver.resolve(inputDto, mockUser);

      expect(result?.street).toBe('789 Explicit Rd');
    });

    it('should fall back to default address when DTO is undefined', () => {
      const result = resolver.resolve(undefined, mockUser);

      expect(result?.street).toBe('123 Default St');
    });
  });
});
