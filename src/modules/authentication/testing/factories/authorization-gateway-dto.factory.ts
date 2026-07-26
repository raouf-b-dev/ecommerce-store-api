import { RoleRecord } from '../../core/application/ports/authorization.gateway';

export class AuthorizationGatewayDtoFactory {
  static buildRoleRecord(overrides?: Partial<RoleRecord>): RoleRecord {
    const baseCommand: RoleRecord = {
      id: 1,
      code: 'CUSTOMER',
    };

    return { ...baseCommand, ...overrides };
  }
}
