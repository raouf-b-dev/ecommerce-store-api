import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  Result,
  isFailure,
} from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { RoleRepository } from '../../../domain/repositories/role.repository';
import { Role } from '../../../domain/entities/role';

export interface UpdateRoleDTO {
  id: number;
  name: string;
  permissions: string[];
}

@Injectable()
export class UpdateRoleUseCase extends UseCase<
  UpdateRoleDTO,
  void,
  UseCaseError
> {
  constructor(private readonly roleRepository: RoleRepository) {
    super();
  }

  async execute(dto: UpdateRoleDTO): Promise<Result<void, UseCaseError>> {
    const result = await this.roleRepository.findById(dto.id);

    if (isFailure(result) || !result.value) {
      return ErrorFactory.UseCaseError(`Role not found`);
    }

    const role = result.value;

    const nameUpdateResult = role.updateName(dto.name);
    if (isFailure(nameUpdateResult)) {
      return ErrorFactory.UseCaseError(
        'Failed to update name',
        nameUpdateResult.error,
      );
    }

    role.updatePermissions(dto.permissions);

    const updateResult = await this.roleRepository.update(role);

    if (isFailure(updateResult)) {
      return ErrorFactory.UseCaseError(
        'Failed to update role',
        updateResult.error,
      );
    }

    return Result.success(undefined);
  }
}
