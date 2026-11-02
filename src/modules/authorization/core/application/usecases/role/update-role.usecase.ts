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

export interface UpdateRoleComand {
  id: number;
  name: string;
  permissions: string[];
}

@Injectable()
export class UpdateRoleUseCase extends UseCase<
  UpdateRoleComand,
  void,
  UseCaseError
> {
  constructor(private readonly roleRepository: RoleRepository) {
    super();
  }

  async execute(dto: UpdateRoleComand): Promise<Result<void, UseCaseError>> {
    const result = await this.roleRepository.findById(dto.id);

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

    const nameUpdateResult = role.updateName(dto.name);
    if (isFailure(nameUpdateResult)) {
      return ErrorFactory.UseCaseError('Failed to update name', {
        cause: nameUpdateResult.error,
      });
    }

    role.updatePermissions(dto.permissions);

    const updateResult = await this.roleRepository.update(role);

    if (isFailure(updateResult)) {
      return ErrorFactory.UseCaseError('Failed to update role', {
        cause: updateResult.error,
      });
    }

    return Result.success(undefined);
  }
}
