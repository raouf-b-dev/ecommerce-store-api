// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { Result } from '../../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import { UserRoleAssignment } from '../entities/user-role-assignment';

export abstract class UserRoleAssignmentRepository {
  abstract save(
    assignment: UserRoleAssignment,
  ): Promise<Result<UserRoleAssignment, RepositoryError>>;
  abstract findByUserId(
    userId: number,
  ): Promise<Result<UserRoleAssignment | null, RepositoryError>>;
  abstract deleteByUserId(
    userId: number,
  ): Promise<Result<void, RepositoryError>>;
}
