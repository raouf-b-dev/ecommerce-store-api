import { IUser } from '../../core/domain/interfaces/user.interface';
import { UserRoleType } from '../../core/domain/value-objects/user-role';

export class UserTestFactory {
  static createMockUser(overrides?: Partial<IUser>): IUser {
    const baseUser: IUser = {
      id: 1,
      email: 'test@example.com',
      passwordHash: 'passwordHash',
      role: UserRoleType.CUSTOMER,
      createdAt: new Date(),
      updatedAt: new Date(),
      customerId: null,
    };
    return { ...baseUser, ...overrides };
  }

  static createMockAdminUser(overrides?: Partial<IUser>): IUser {
    const baseUser: IUser = {
      id: 1,
      email: 'test@example.com',
      passwordHash: 'passwordHash',
      role: UserRoleType.ADMIN,
      createdAt: new Date(),
      updatedAt: new Date(),
      customerId: null,
    };

    return { ...baseUser, ...overrides };
  }

  static createMockCustomerUser(overrides?: Partial<IUser>): IUser {
    const baseUser: IUser = {
      id: 1,
      email: 'test@example.com',
      passwordHash: 'passwordHash',
      role: UserRoleType.CUSTOMER,
      createdAt: new Date(),
      updatedAt: new Date(),
      customerId: null,
    };
    return { ...baseUser, ...overrides };
  }
}
