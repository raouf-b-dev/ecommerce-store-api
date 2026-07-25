import { Injectable } from '@nestjs/common';
import { Result, isFailure } from '../../../../shared-kernel/domain/result';
import { InfrastructureError } from '../../../../shared-kernel/domain/exceptions/infrastructure-error';
import { ErrorFactory } from '../../../../shared-kernel/domain/exceptions/error.factory';
import { CreateUserUseCase } from 'src/modules/access/core/application/usecases/user/create-user/create-user.usecase';
import { CheckEmailExistsUseCase } from 'src/modules/access/core/application/usecases/user/check-user-by-email/check-user-by-email.usecase';
import { GetUserByEmailUseCase } from 'src/modules/access/core/application/usecases/user/get-user-by-email/get-user-by-email.usecase';
import { GetUserUseCase } from 'src/modules/access/core/application/usecases/user/get-user/get-user.usecase';
import { SYSTEM_CALLER_CONTEXT } from '../../../../shared-kernel/domain/interfaces/caller-context.interface';
import {
  CreateUserInput,
  IdentityGateway,
  UserRecord,
} from '../../core/application/ports/identity.gateway';
import { DeleteUserUseCase } from 'src/modules/access/core/application/usecases/user/delete-user/delete-user.usecase';

@Injectable()
export class ModuleIdentityGateway implements IdentityGateway {
  constructor(
    private readonly createUserUseCase: CreateUserUseCase,
    private readonly getUserUseCase: GetUserUseCase,
    private readonly getUserByEmailUseCase: GetUserByEmailUseCase,
    private readonly checkEmailExistsUseCase: CheckEmailExistsUseCase,
    private readonly deleteUserUseCase: DeleteUserUseCase,
  ) {}

  async deleteUser(id: number): Promise<Result<void, InfrastructureError>> {
    const result = await this.deleteUserUseCase.execute(id);

    if (isFailure(result)) {
      return ErrorFactory.InfrastructureError('Failed to delete user');
    }

    return Result.success(undefined);
  }

  async findUserById(
    id: number,
  ): Promise<Result<UserRecord | null, InfrastructureError>> {
    const result = await this.getUserUseCase.execute({
      userId: id,
      callerContext: SYSTEM_CALLER_CONTEXT,
    });
    if (isFailure(result)) return result;

    if (!result.value) {
      return ErrorFactory.InfrastructureError('Failed to find user by id');
    }

    const user = result.value;

    const userRecord: UserRecord = {
      id: user.id!,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      isActive: user.isActive,
    };
    return Result.success(userRecord);
  }

  async findUserByEmail(
    email: string,
  ): Promise<Result<UserRecord | null, InfrastructureError>> {
    const result = await this.getUserByEmailUseCase.execute({
      email,
      callerContext: SYSTEM_CALLER_CONTEXT,
    });
    if (isFailure(result)) return result;

    if (!result.value) {
      return ErrorFactory.InfrastructureError('Failed to find user by email');
    }

    const user = result.value;

    const userRecord: UserRecord = {
      id: user.id!,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      phone: user.phone,
      isActive: user.isActive,
    };
    return Result.success(userRecord);
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
    });

    if (isFailure(result)) {
      return ErrorFactory.InfrastructureError(
        'Failed to create user',
        result.error,
      );
    }

    const userRecord: UserRecord = {
      id: result.value.id!,
      firstName: result.value.firstName,
      lastName: result.value.lastName,
      email: result.value.email,
      phone: result.value.phone,
      isActive: result.value.isActive,
    };

    return Result.success(userRecord);
  }
}
