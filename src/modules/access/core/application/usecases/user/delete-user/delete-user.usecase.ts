import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  isFailure,
  Result,
} from '../../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { UserRepository } from 'src/modules/access/core/domain/repositories/user.repository';

@Injectable()
export class DeleteUserUseCase extends UseCase<number, void, UseCaseError> {
  constructor(private readonly userRepository: UserRepository) {
    super();
  }

  async execute(id: number): Promise<Result<void, UseCaseError>> {
    const deleteResult = await this.userRepository.delete(id);

    if (isFailure(deleteResult)) return deleteResult;

    return Result.success(undefined);
  }
}
