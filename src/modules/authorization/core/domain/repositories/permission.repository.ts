// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { Result } from '../../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import { Permission } from '../entities/permission';

export abstract class PermissionRepository {
  abstract findByCode(
    code: string,
  ): Promise<Result<Permission | null, RepositoryError>>;
  abstract findAll(): Promise<Result<Permission[], RepositoryError>>;
  abstract saveMany(
    permissions: Permission[],
  ): Promise<Result<Permission[], RepositoryError>>;
}
