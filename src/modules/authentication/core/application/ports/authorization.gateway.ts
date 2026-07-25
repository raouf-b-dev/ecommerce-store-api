import { Result } from '../../../../../shared-kernel/domain/result';
import { InfrastructureError } from '../../../../../shared-kernel/domain/exceptions/infrastructure-error';

export interface RoleRecord {
  id: number;
  code: string;
}

export abstract class AuthorizationGateway {
  abstract assignDefaultRole(
    userId: number,
  ): Promise<Result<void, InfrastructureError>>;
  abstract findRoleByUserId(
    userId: number,
  ): Promise<Result<RoleRecord | null, InfrastructureError>>;
}
