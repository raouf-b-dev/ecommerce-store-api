import { IUser } from '../../core/domain/interfaces/user.interface';
import { CreateUserCommand } from '../../core/application/usecases/user/create-user/create-user.usecase';
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

  static createUpdateAddressCommand(overrides?: any) {
    return AddressTestFactory.createUpdateAddressCommand(overrides);
  }

  static createAddAddressCommand(overrides?: any) {
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
