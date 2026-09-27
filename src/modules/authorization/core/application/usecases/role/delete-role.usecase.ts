import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  Result,
  isFailure,
} from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { RoleRepository } from '../../../domain/repositories/role.repository';

@Injectable()
export class DeleteRoleUseCase extends UseCase<number, void, UseCaseError> {
  constructor(private readonly roleRepository: RoleRepository) {
    super();
  }

  async execute(id: number): Promise<Result<void, UseCaseError>> {
    const result = await this.roleRepository.findById(id);

    if (isFailure(result) || !result.value) {
      return ErrorFactory.UseCaseError(`Role not found`);
    }

    const role = result.value;

    const validationResult = role.validateNotSystemForDeletion();
    if (isFailure(validationResult)) {
      return ErrorFactory.UseCaseError(
        'Cannot delete role',
        validationResult.error,
      );
    }

    const deleteResult = await this.roleRepository.delete(id);

    if (isFailure(deleteResult)) {
      return ErrorFactory.UseCaseError(
        'Failed to delete role',
        deleteResult.error,
      );
    }

    return Result.success(undefined);
  }
}
