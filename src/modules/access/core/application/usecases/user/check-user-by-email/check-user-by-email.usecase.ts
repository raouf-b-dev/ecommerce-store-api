import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  isFailure,
  Result,
} from '../../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { UserRepository } from 'src/modules/access/core/domain/repositories/user.repository';

@Injectable()
export class CheckEmailExistsUseCase extends UseCase<
  string,
  boolean,
  UseCaseError
> {
  constructor(private readonly userRepository: UserRepository) {
    super();
  }

  async execute(email: string): Promise<Result<boolean, UseCaseError>> {
    const userResult = await this.userRepository.existsByEmail(email);
    if (isFailure(userResult)) return userResult;

    return Result.success(userResult.value);
  }
}
