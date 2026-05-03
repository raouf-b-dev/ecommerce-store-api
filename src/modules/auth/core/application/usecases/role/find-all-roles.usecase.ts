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
export class FindAllRolesUseCase extends UseCase<void, IRole[], UseCaseError> {
  constructor(private readonly roleRepository: RoleRepository) {
    super();
  }

  async execute(): Promise<Result<IRole[], UseCaseError>> {
    const result = await this.roleRepository.findAll();

    if (isFailure(result)) {
      return ErrorFactory.UseCaseError('Failed to load roles', result.error);
    }

    return Result.success(result.value.map((r) => r.toPrimitives()));
  }
}
