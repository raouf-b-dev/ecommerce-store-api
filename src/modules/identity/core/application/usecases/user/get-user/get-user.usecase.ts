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
  USER_ACCESS_PERMISSIONS,
  OwnedResourceAccessPolicy,
} from '../../../../../../../shared-kernel/domain/policies/owned-resource-access.policy';
import { UserQueryService } from '../../../ports/user-query.service';
import { UserDetailDTO } from '../../../queries/results/user-detail.result';
import { userNotFoundError } from '../../../services/user-not-found';

export interface GetUserInput {
  userId: number;
  callerContext: CallerContext;
}

@Injectable()
export class GetUserUseCase extends UseCase<
  GetUserInput,
  UserDetailDTO,
  UseCaseError
> {
  constructor(private readonly userQueryService: UserQueryService) {
    super();
  }

  async execute(
    input: GetUserInput,
  ): Promise<Result<UserDetailDTO, UseCaseError>> {
    const { userId, callerContext } = input;

    if (
      !OwnedResourceAccessPolicy.canViewResource(
        callerContext,
        userId,
        USER_ACCESS_PERMISSIONS,
      )
    ) {
      return userNotFoundError(userId);
    }

    const result = await this.userQueryService.getById(userId);

    if (isFailure(result)) {
      return ErrorFactory.UseCaseError(result.error.message, {
        cause: result.error,
        kind: result.error.kind,
        retryable: result.error.retryable,
      });
    }

    if (!result.value) {
      return userNotFoundError(userId);
    }

    return Result.success(result.value);
  }
}
