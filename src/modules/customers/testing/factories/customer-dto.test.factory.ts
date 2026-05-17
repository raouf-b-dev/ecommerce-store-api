import { CreateCustomerCommand } from '../../core/application/usecases/create-customer/create-customer.usecase';
import { UpdateCustomerCommand } from '../../core/application/usecases/update-customer/update-customer.usecase';
import { AddAddressCommand } from '../../core/application/usecases/add-address/add-address.usecase';
import { UpdateAddressCommand } from '../../core/application/usecases/update-address/update-address.usecase';
import { ListCustomersQuery } from '../../core/application/usecases/list-customers/list-customers.usecase';
import { AddressType } from '../../core/domain/value-objects/address-type';

export class CustomerCommandTestFactory {
  static createCreateCustomerCommand(
    overrides?: Partial<CreateCustomerCommand>,
  ): CreateCustomerCommand {
    const baseCommand: CreateCustomerCommand = {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
    };

    return { ...baseCommand, ...overrides };
  }

  static createCreateCustomerWithAddressCommand(
    overrides?: Partial<CreateCustomerCommand>,
  ): CreateCustomerCommand {
    return this.createCreateCustomerCommand({
      ...overrides,
      address: this.createAddAddressCommand(),
    });
  }

  static createUpdateCustomerCommand(
    overrides?: Partial<UpdateCustomerCommand>,
  ): UpdateCustomerCommand {
    const baseCommand: UpdateCustomerCommand = {
      firstName: 'Jane',
      lastName: 'Smith',
    };

    return { ...baseCommand, ...overrides };
  }

  static createAddAddressCommand(
    overrides?: Partial<AddAddressCommand>,
  ): AddAddressCommand {
    const baseCommand: AddAddressCommand = {
      street: '123 Main St',
      city: 'New York',
      state: 'NY',
      postalCode: '10001',
      country: 'US',
      type: AddressType.HOME,
      isDefault: true,
    };

    return { ...baseCommand, ...overrides };
  }

  static createUpdateAddressCommand(
    overrides?: Partial<UpdateAddressCommand>,
  ): UpdateAddressCommand {
    const baseCommand: UpdateAddressCommand = {
      street: '456 Elm St',
      city: 'Los Angeles',
      state: 'CA',
    };

    return { ...baseCommand, ...overrides };
  }

  static createListCustomersQuery(
    overrides?: Partial<ListCustomersQuery>,
  ): ListCustomersQuery {
    const baseQuery: ListCustomersQuery = {
      page: 1,
      limit: 10,
    };

    return { ...baseQuery, ...overrides };
  }

  // Invalid Commands (for validation testing if needed, though use cases might not do it)
  static createInvalidCreateCustomerCommand(): CreateCustomerCommand {
    return {
      firstName: '',
      lastName: '',
      email: 'invalid-email',
    };
  }

  static createInvalidAddAddressCommand(): AddAddressCommand {
    return {
      street: '',
      city: '',
      state: '',
      postalCode: '',
      country: '',
    };
  }
}
