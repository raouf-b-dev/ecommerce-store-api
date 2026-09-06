import { Injectable } from '@nestjs/common';
import { isFailure, Result } from 'src/shared-kernel/domain/result';
import { InfrastructureError } from 'src/shared-kernel/domain/exceptions/infrastructure-error';
import { AuthorizationGateway } from '../../core/application/ports/authorization.gateway';
import { AssignRoleUseCase } from 'src/modules/authorization/core/application/usecases/user-role/assign-role.usecase';

@Injectable()
export class ModuleAuthorizationGateway extends AuthorizationGateway {
  constructor(private readonly assignRoleUseCase: AssignRoleUseCase) {
    super();
  }

  async assignRole(
    userId: number,
    roleCode: string,
  ): Promise<Result<void, InfrastructureError>> {
    const result = await this.assignRoleUseCase.execute({ userId, roleCode });
    if (isFailure(result)) {
      return Result.failure(
        new InfrastructureError(
          result.error.message,
          result.error.cause,
          result.error.statusCode,
        ),
      );
    }
    return Result.success(undefined);
  }
}
