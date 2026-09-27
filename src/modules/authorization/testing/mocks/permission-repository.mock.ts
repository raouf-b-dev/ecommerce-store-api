// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: MIT

import { PermissionRepository } from '../../core/domain/repositories/permission.repository';
import { Result } from '../../../../shared-kernel/domain/result';
import { Permission } from '../../core/domain/entities/permission';
import { RepositoryError } from '../../../../shared-kernel/domain/exceptions/repository.error';

export class MockPermissionRepository implements PermissionRepository {
  findByCode = jest.fn<
    Promise<Result<Permission | null, RepositoryError>>,
    [string]
  >();
  findAll = jest.fn<Promise<Result<Permission[], RepositoryError>>, []>();
  saveMany = jest.fn<
    Promise<Result<Permission[], RepositoryError>>,
    [Permission[]]
  >();
}
