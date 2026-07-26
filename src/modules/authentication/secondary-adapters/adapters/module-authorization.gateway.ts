import { Injectable } from '@nestjs/common';
import { InfrastructureError } from 'src/shared-kernel/domain/exceptions/infrastructure-error';
import { isFailure, Result } from 'src/shared-kernel/domain/result';
import {
  AuthorizationGateway,
  RoleRecord,
} from '../../core/application/ports/authorization.gateway';
import { AssignRoleUseCase } from 'src/modules/authorization/core/application/usecases/user-role/assign-role.usecase';
import { AssignDefaultRoleUseCase } from 'src/modules/authorization/core/application/usecases/user-role/assign-default-role.usecase';
import { FindRoleByUserIdUseCase } from 'src/modules/authorization/core/application/usecases/user-role/find-role-by-user-id.usecase';

@Injectable()
export class ModuleAuthorizationGateway extends AuthorizationGateway {
  constructor(
    private readonly assignRoleUseCase: AssignRoleUseCase,
    private readonly assignDefaultRoleUseCase: AssignDefaultRoleUseCase,
    private readonly findRoleByUserIdUseCase: FindRoleByUserIdUseCase,
  ) {
    super();
  }

  async assignRole(
    userId: number,
    roleCode: string,
  ): Promise<Result<void, InfrastructureError>> {
    const result = await this.assignRoleUseCase.execute({ userId, roleCode });
    if (isFailure(result)) {
      return Result.failure(new InfrastructureError(result.error.message));
    }
    return Result.success(undefined);
  }

  async assignDefaultRole(
    userId: number,
  ): Promise<Result<void, InfrastructureError>> {
    const result = await this.assignDefaultRoleUseCase.execute(userId);
    if (isFailure(result)) {
      return Result.failure(new InfrastructureError(result.error.message));
    }
    return Result.success(undefined);
  }

  async findRoleByUserId(
    userId: number,
  ): Promise<Result<RoleRecord | null, InfrastructureError>> {
    const result = await this.findRoleByUserIdUseCase.execute(userId);
    if (isFailure(result)) return result;

    return Result.success(result.value);
  }
}
