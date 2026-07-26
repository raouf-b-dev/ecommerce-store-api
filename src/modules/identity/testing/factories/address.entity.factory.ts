import { AddAddressCommand } from '../../core/application/usecases/address/add-address/add-address.usecase';
import { UpdateAddressCommand } from '../../core/application/usecases/address/update-address/update-address.usecase';
import { IAddress } from '../../core/domain/interfaces/address.interface';
import { AddressType } from '../../../../shared-kernel/domain/value-objects/address-type';

export class AddressTestFactory {
  static createMockAddress(overrides?: Partial<IAddress>): IAddress {
    const baseAddress: IAddress = {
      id: 123,
      userId: 123,
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
    };
    return { ...baseAddress, ...overrides };
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
