import {
  CreateUserInput,
  RoleCredentials,
  UserCredentials,
  UserRecord,
} from '../../../auth/core/application/ports/access.gateway';

export class IdentityAccessGatewayCommandTestFactory {
  static createUserInputCommand(
    overrides?: Partial<CreateUserInput>,
  ): CreateUserInput {
    const baseCommand: CreateUserInput = {
      firstName: 'test',
      lastName: 'test',
      email: 'test@example.com',
      passwordHash: 'password',
      mustChangePassword: false,
    };

    return { ...baseCommand, ...overrides };
  }

  static createUserCredentialsCommand(
    overrides?: Partial<UserCredentials>,
  ): UserCredentials {
    const baseCommand: UserCredentials = {
      id: 1,
      email: 'test@example.com',
      passwordHash: 'password',
      isActive: true,
      roleId: 1,
    };

    return { ...baseCommand, ...overrides };
  }

  static createRoleCredentialsCommand(
    overrides?: Partial<RoleCredentials>,
  ): RoleCredentials {
    const baseCommand: RoleCredentials = {
      id: 1,
      code: 'CUSTOMER',
    };

    return { ...baseCommand, ...overrides };
  }

  static createUserRecord(overrides?: Partial<UserRecord>): UserRecord {
    const baseCommand: UserRecord = {
      id: 1,
    };

    return { ...baseCommand, ...overrides };
  }
}
