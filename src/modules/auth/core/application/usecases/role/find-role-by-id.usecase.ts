import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  Result,
  isFailure,
} from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { RoleRepository } from '../../../domain/repositories/role.repository';
import { IRole } from '../../../domain/entities/role';

@Injectable()
export class FindRoleByIdUseCase extends UseCase<number, IRole, UseCaseError> {
  constructor(private readonly roleRepository: RoleRepository) {
    super();
  }

  async execute(id: number): Promise<Result<IRole, UseCaseError>> {
    const result = await this.roleRepository.findById(id);

    if (isFailure(result)) {
      return ErrorFactory.UseCaseError('Failed to find role', result.error);
    }

    if (!result.value) {
      return ErrorFactory.UseCaseError('Role not found');
    }

    return Result.success(result.value.toPrimitives());
  }
}
