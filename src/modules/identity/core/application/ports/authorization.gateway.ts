import { Result } from '../../../../../shared-kernel/domain/result';
import { InfrastructureError } from '../../../../../shared-kernel/domain/exceptions/infrastructure-error';

export abstract class AuthorizationGateway {
  abstract assignRole(
    userId: number,
    roleCode: string,
  ): Promise<Result<void, InfrastructureError>>;
}
