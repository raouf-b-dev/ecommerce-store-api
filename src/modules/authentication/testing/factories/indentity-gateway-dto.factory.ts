import {
  CreateUserInput,
  UserRecord,
} from '../../core/application/ports/identity.gateway';

export class IdentityAccessGatewayDtoFactory {
  static buildCreateUserInput(
    overrides?: Partial<CreateUserInput>,
  ): CreateUserInput {
    const baseCommand: CreateUserInput = {
      firstName: 'test',
      lastName: 'test',
      email: 'test@example.com',
      phone: '123456789',
    };

    return { ...baseCommand, ...overrides };
  }

  static buildUserRecord(overrides?: Partial<UserRecord>): UserRecord {
    const baseCommand: UserRecord = {
      id: 1,
      email: 'test@example.com',
      firstName: 'test',
      lastName: 'test',
      phone: '123456789',
      isActive: true,
    };

    return { ...baseCommand, ...overrides };
  }
}
