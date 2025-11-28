import { ICustomer } from '../../domain/interfaces/customer.interface';
import { AddressType } from '../../domain/value-objects/address-type';

export class CustomerTestFactory {
  static createMockCustomer(overrides?: Partial<ICustomer>): ICustomer {
    const baseCustomer: ICustomer = {
      id: 'customer-123',
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '1234567890',
      addresses: [],
      totalOrders: 0,
      totalSpent: 0,
      createdAt: new Date('2025-01-01T10:00:00Z'),
      updatedAt: new Date('2025-01-01T10:00:00Z'),
    };

    return { ...baseCustomer, ...overrides };
  }

  static createCustomerWithAddress(overrides?: Partial<ICustomer>): ICustomer {
    return this.createMockCustomer({
      addresses: [
        {
          id: 'address-123',
          street: '123 Main St',
          street2: null,
          city: 'New York',
          state: 'NY',
          postalCode: '10001',
          country: 'USA',
          type: AddressType.HOME,
          isDefault: true,
          deliveryInstructions: null,
          createdAt: new Date('2025-01-01T10:00:00Z'),
          updatedAt: new Date('2025-01-01T10:00:00Z'),
        },
      ],
      ...overrides,
    });
  }
}
