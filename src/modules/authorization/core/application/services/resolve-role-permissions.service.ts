// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { Injectable } from '@nestjs/common';
import { RoleRepository } from '../../domain/repositories/role.repository';
import { RolePermissionsVO } from '../../domain/value-objects/role-permissions';
import { Result, isFailure } from '../../../../../shared-kernel/domain/result';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { UseCaseError } from '../../../../../shared-kernel/domain/exceptions/usecase.error';

@Injectable()
export class ResolveRolePermissionsService {
  constructor(private readonly roleRepository: RoleRepository) {}

  async execute(
    roleCode: string,
  ): Promise<Result<RolePermissionsVO, UseCaseError>> {
    const result =
      await this.roleRepository.findPermissionCodesByRoleCode(roleCode);

    if (isFailure(result)) {
      return ErrorFactory.UseCaseError(
        'Failed to resolve role permissions',
        result.error,
      );
    }

    const codes = result.value || [];
    return Result.success(RolePermissionsVO.fromCodes(codes));
  }
}
