import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  Result,
  isFailure,
} from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { ErrorKind } from '../../../../../../shared-kernel/domain/exceptions/error-kind';
import { RoleRepository } from '../../../domain/repositories/role.repository';
import { roleNotFoundError } from '../../services/role-not-found';

@Injectable()
export class DeleteRoleUseCase extends UseCase<number, void, UseCaseError> {
  constructor(private readonly roleRepository: RoleRepository) {
    super();
  }

  async execute(id: number): Promise<Result<void, UseCaseError>> {
    const result = await this.roleRepository.findById(id);

    if (isFailure(result)) {
      if (result.error.kind === ErrorKind.NOT_FOUND) {
        return roleNotFoundError();
      }
      return ErrorFactory.UseCaseError('Failed to find role', {
        cause: result.error,
        kind: result.error.kind,
        retryable: result.error.retryable,
      });
    }

    if (!result.value) {
      return roleNotFoundError();
    }

    const role = result.value;

    const validationResult = role.validateNotSystemForDeletion();
    if (isFailure(validationResult)) {
      return ErrorFactory.UseCaseError('Cannot delete role', {
        cause: validationResult.error,
      });
    }

    const deleteResult = await this.roleRepository.delete(id);

    if (isFailure(deleteResult)) {
      return ErrorFactory.UseCaseError('Failed to delete role', {
        cause: deleteResult.error,
      });
    }

    return Result.success(undefined);
  }
}
