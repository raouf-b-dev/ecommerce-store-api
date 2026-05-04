import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  Result,
  isFailure,
} from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { RoleRepository } from '../../../domain/repositories/role.repository';
import { Role, IRole } from '../../../domain/entities/role';

export interface CreateRoleDTO {
  code: string;
  name: string;
  permissions: string[];
}

@Injectable()
export class CreateRoleUseCase extends UseCase<
  CreateRoleDTO,
  IRole,
  UseCaseError
> {
  constructor(private readonly roleRepository: RoleRepository) {
    super();
  }

  async execute(dto: CreateRoleDTO): Promise<Result<IRole, UseCaseError>> {
    const existing = await this.roleRepository.findByCode(dto.code);
    if (isFailure(existing)) {
      return ErrorFactory.UseCaseError(
        'Failed to validate role code uniqueness',
        existing.error,
      );
    }

    if (existing.value) {
      return ErrorFactory.UseCaseError(
        `Role with code ${dto.code} already exists`,
      );
    }

    const role = new Role({
      id: 0,
      code: dto.code,
      name: dto.name,
      isSystem: false,
      permissions: dto.permissions,
    });

    const result = await this.roleRepository.save(role);

    if (isFailure(result)) {
      return ErrorFactory.UseCaseError('Failed to create role', result.error);
    }

    return Result.success(result.value.toPrimitives());
  }
}
