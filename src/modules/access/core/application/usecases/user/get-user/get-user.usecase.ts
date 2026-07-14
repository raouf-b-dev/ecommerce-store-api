import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  isFailure,
  Result,
} from '../../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../../shared-kernel/domain/exceptions/error.factory';
import { CallerContext } from '../../../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import {
  CUSTOMER_ACCESS_PERMISSIONS,
  OwnedResourceAccessPolicy,
} from '../../../../../../../shared-kernel/domain/policies/owned-resource-access.policy';
import { IUser } from 'src/modules/access/core/domain/interfaces/user.interface';
import { UserRepository } from 'src/modules/access/core/domain/repositories/user.repository';

export interface GetUserInput {
  userId: number;
  callerContext: CallerContext;
}

@Injectable()
export class GetUserUseCase extends UseCase<GetUserInput, IUser, UseCaseError> {
  constructor(private readonly userRepository: UserRepository) {
    super();
  }

  async execute(input: GetUserInput): Promise<Result<IUser, UseCaseError>> {
    const { userId, callerContext } = input;

    if (
      !OwnedResourceAccessPolicy.canViewResource(
        callerContext,
        userId,
        CUSTOMER_ACCESS_PERMISSIONS,
      )
    ) {
      return ErrorFactory.UseCaseError(`User with id ${userId} not found`);
    }

    const userResult = await this.userRepository.findById(userId);

    if (isFailure(userResult)) return userResult;

    const user = userResult.value;
    if (!user) {
      return ErrorFactory.UseCaseError(`User with id ${userId} not found`);
    }

    return Result.success(userResult.value.toPrimitives());
  }
}
