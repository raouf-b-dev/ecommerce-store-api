import { IUser } from '../../core/domain/interfaces/user.interface';

export class UserTestFactory {
  static createMockUser(overrides?: Partial<IUser>): IUser {
    const baseUser: IUser = {
      id: 1,
      email: 'test@example.com',
      passwordHash: 'passwordHash',
      roleId: 2,
      mustChangePassword: false,
      isActive: true,
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
      roleId: 1,
      mustChangePassword: false,
      isActive: true,
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
      roleId: 2,
      mustChangePassword: false,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      customerId: null,
    };
    return { ...baseUser, ...overrides };
  }
}
