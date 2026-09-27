// src/modules/customers/application/usecases/get-customer/get-customer.usecase.ts
import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  isFailure,
  Result,
} from '../../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../../shared-kernel/domain/exceptions/error.factory';
import { UserRepository } from 'src/modules/identity/core/domain/repositories/user.repository';
import { IUser } from 'src/modules/identity/core/domain/interfaces/user.interface';

import { CallerContext } from '../../../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import { HttpStatus } from '@nestjs/common';

import {
  USER_ACCESS_PERMISSIONS,
  OwnedResourceAccessPolicy,
} from '../../../../../../../shared-kernel/domain/policies/owned-resource-access.policy';

export interface GetUserByEmailInput {
  email: string;
  callerContext: CallerContext;
}

@Injectable()
export class GetUserByEmailUseCase extends UseCase<
  GetUserByEmailInput,
  IUser,
  UseCaseError
> {
  constructor(private readonly userRepository: UserRepository) {
    super();
  }

  async execute(
    input: GetUserByEmailInput,
  ): Promise<Result<IUser, UseCaseError>> {
    const { email, callerContext } = input;

    const userResult = await this.userRepository.findByEmail(email);

    if (isFailure(userResult)) return userResult;

    const user = userResult.value;
    if (!user) {
      return ErrorFactory.UseCaseError(
        `User with email ${email} not found`,
        null,
        HttpStatus.NOT_FOUND,
      );
    }

    if (
      !OwnedResourceAccessPolicy.canViewResource(
        callerContext,
        user.id,
        USER_ACCESS_PERMISSIONS,
      )
    ) {
      return ErrorFactory.UseCaseError(
        'Access denied: You do not have permission to view this profile',
        null,
        HttpStatus.FORBIDDEN,
      );
    }

    return Result.success<IUser>(user);
  }
}
