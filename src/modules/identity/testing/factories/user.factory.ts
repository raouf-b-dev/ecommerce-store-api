import { IUser } from '../../core/domain/interfaces/user.interface';
import { UserProps } from '../../core/domain/entities/user';
import { CreateUserCommand } from '../../core/application/usecases/user/create-user/create-user.usecase';
import { AddAddressCommand } from '../../core/application/commands/add-address.command';
import { UpdateAddressCommand } from '../../core/application/commands/update-address.command';
import { AddressTestFactory } from './address.entity.factory';

export class UserTestFactory {
  static createMockUser(overrides?: Partial<IUser>): IUser {
    const baseUser: IUser = {
      id: 1,
      firstName: 'firstName',
      lastName: 'lastName',
      phone: 'phone',
      email: 'test@example.com',
      addresses: [AddressTestFactory.createMockAddress()],
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    return { ...baseUser, ...overrides };
  }

  static createUserWithAddress(overrides?: Partial<IUser>): IUser {
    return this.createMockUser(overrides);
  }

  static createUserProps(overrides?: Partial<IUser>): UserProps {
    const user = this.createMockUser(overrides);

    return {
      id: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      isActive: user.isActive,
      addresses: user.addresses.map((address) =>
        AddressTestFactory.createAddressProps({
          id: address.id ?? undefined,
          userId: address.userId,
          street: address.street,
          street2: address.street2,
          city: address.city,
          state: address.state,
          postalCode: address.postalCode,
          country: address.country,
          type: address.type,
          isDefault: address.isDefault,
          deliveryInstructions: address.deliveryInstructions,
          createdAt: address.createdAt,
          updatedAt: address.updatedAt,
        }),
      ),
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  static createUpdateAddressCommand(
    overrides?: Partial<UpdateAddressCommand>,
  ): UpdateAddressCommand {
    return AddressTestFactory.createUpdateAddressCommand(overrides);
  }

  static createAddAddressCommand(
    overrides?: Partial<AddAddressCommand>,
  ): AddAddressCommand {
    return AddressTestFactory.createAddAddressCommand(overrides);
  }

  static createCreateUserCommand(
    overrides?: Partial<CreateUserCommand>,
  ): CreateUserCommand {
    return {
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      ...overrides,
    };
  }
}
