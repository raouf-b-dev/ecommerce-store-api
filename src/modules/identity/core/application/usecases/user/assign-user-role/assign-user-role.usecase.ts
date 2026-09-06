import { Injectable, HttpStatus } from '@nestjs/common';
import { UseCase } from '../../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  Result,
  isFailure,
} from '../../../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../../../shared-kernel/domain/exceptions/error.factory';
import { UseCaseError } from '../../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { UserRepository } from '../../../../domain/repositories/user.repository';
import { AuthorizationGateway } from '../../../ports/authorization.gateway';

export interface AssignUserRoleCommand {
  userId: number;
  roleCode: string;
}

@Injectable()
export class AssignUserRoleUseCase extends UseCase<
  AssignUserRoleCommand,
  void,
  UseCaseError
> {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly authorizationGateway: AuthorizationGateway,
  ) {
    super();
  }

  async execute(
    command: AssignUserRoleCommand,
  ): Promise<Result<void, UseCaseError>> {
    const userResult = await this.userRepository.findById(command.userId);

    if (isFailure(userResult)) {
      return ErrorFactory.UseCaseError(userResult.error.message);
    }

    if (!userResult.value) {
      return ErrorFactory.UseCaseError(
        'User not found',
        null,
        HttpStatus.NOT_FOUND,
      );
    }

    const assignResult = await this.authorizationGateway.assignRole(
      command.userId,
      command.roleCode,
    );

    if (isFailure(assignResult)) {
      return ErrorFactory.UseCaseError(
        assignResult.error.message,
        assignResult.error.cause,
        assignResult.error.statusCode,
      );
    }

    return Result.success(undefined);
  }
}
