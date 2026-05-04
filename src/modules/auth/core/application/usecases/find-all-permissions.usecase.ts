import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../shared-kernel/domain/interfaces/base.usecase';
import { Result } from '../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { PermissionRepository } from '../../domain/repositories/permission.repository';
import { IPermission } from '../../domain/entities/permission';

@Injectable()
export class FindAllPermissionsUseCase extends UseCase<
  void,
  IPermission[],
  UseCaseError
> {
  constructor(private readonly permissionRepo: PermissionRepository) {
    super();
  }

  async execute(): Promise<Result<IPermission[], UseCaseError>> {
    const result = await this.permissionRepo.findAll();
    if (result.isFailure) {
      return ErrorFactory.UseCaseError(
        'Failed to load permissions',
        result.error,
      );
    }
    return Result.success(result.value.map((p) => p.toPrimitives()));
  }
}
