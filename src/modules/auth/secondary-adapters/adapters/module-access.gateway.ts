import { Injectable } from '@nestjs/common';
import {
  IdentityAccessGateway,
  CreateUserInput,
  UserRecord,
  UserCredentials,
  RoleCredentials,
} from '../../core/application/ports/access.gateway';
import { Result, isFailure } from '../../../../shared-kernel/domain/result';
import { InfrastructureError } from '../../../../shared-kernel/domain/exceptions/infrastructure-error';
import { ErrorFactory } from '../../../../shared-kernel/domain/exceptions/error.factory';
import { CreateUserUseCase } from 'src/modules/access/core/application/usecases/user/create-user/create-user.usecase';
import { CheckEmailExistsUseCase } from 'src/modules/access/core/application/usecases/user/check-user-by-email/check-user-by-email.usecase';
import { GetUserByEmailUseCase } from 'src/modules/access/core/application/usecases/user/get-user-by-email/get-user-by-email.usecase';
import { GetUserUseCase } from 'src/modules/access/core/application/usecases/user/get-user/get-user.usecase';
import { FindRoleByIdUseCase } from 'src/modules/access/core/application/usecases/role/find-role-by-id.usecase';
import { SYSTEM_CALLER_CONTEXT } from '../../../../shared-kernel/domain/interfaces/caller-context.interface';

@Injectable()
export class ModuleAccessGateway implements IdentityAccessGateway {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly getUserUseCase: GetUserUseCase,
    private readonly findRoleByIdUseCase: FindRoleByIdUseCase,
    private readonly getUserByEmailUseCase: GetUserByEmailUseCase,
    private readonly checkEmailExistsUseCase: CheckEmailExistsUseCase,
  ) {}
  async findRoleById(
    id: number,
  ): Promise<Result<RoleCredentials | null, InfrastructureError>> {
    const result = await this.findRoleByIdUseCase.execute(id);
    if (isFailure(result)) return result;

    if (!result.value) {
      return ErrorFactory.InfrastructureError('Failed to find role by id');
    }

    const role = result.value;

    const RoleCredentials: RoleCredentials = {
      id: role.id,
      code: role.code,
    };
    return Result.success(RoleCredentials);
  }
  async findCredentialsById(
    id: number,
  ): Promise<Result<UserCredentials | null, InfrastructureError>> {
    const result = await this.getUserUseCase.execute({
      userId: id,
      callerContext: SYSTEM_CALLER_CONTEXT,
    });
    if (isFailure(result)) return result;

    if (!result.value) {
      return ErrorFactory.InfrastructureError('Failed to find user by id');
    }

    const user = result.value;

    const UserCredentials: UserCredentials = {
      id: user.id!,
      email: user.email,
      passwordHash: user.passwordHash,
      isActive: user.isActive,
      roleId: user.roleId,
    };
    return Result.success(UserCredentials);
  }

  async findCredentialsByEmail(
    email: string,
  ): Promise<Result<UserCredentials | null, InfrastructureError>> {
    const result = await this.getUserByEmailUseCase.execute({
      email,
      callerContext: SYSTEM_CALLER_CONTEXT,
    });
    if (isFailure(result)) return result;

    if (!result.value) {
      return ErrorFactory.InfrastructureError('Failed to find user by email');
    }

    const user = result.value;

    const UserCredentials: UserCredentials = {
      id: user.id!,
      email: user.email,
      passwordHash: user.passwordHash,
      isActive: user.isActive,
      roleId: user.roleId,
    };
    return Result.success(UserCredentials);
  }

  async checkEmailExists(
    email: string,
  ): Promise<Result<boolean, InfrastructureError>> {
    const result = await this.checkEmailExistsUseCase.execute(email);
    if (isFailure(result)) return result;

    return Result.success(result.value);
  }

  async createUser(
    input: CreateUserInput,
  ): Promise<Result<UserRecord, InfrastructureError>> {
    const result = await this.createUserUseCase.execute({
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone ?? undefined,
      mustChangePassword: input.mustChangePassword,
      passwordHash: input.passwordHash,
    });

    if (isFailure(result)) {
      return ErrorFactory.InfrastructureError(
        'Failed to create customer',
        result.error,
      );
    }

    return Result.success({ id: result.value.id });
  }
}
