// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { Result } from '../../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import { SessionToken } from '../entities/session-token';

export abstract class SessionTokenRepository {
  abstract save(
    session: SessionToken,
  ): Promise<Result<SessionToken, RepositoryError>>;
  abstract findById(
    id: string,
  ): Promise<Result<SessionToken | null, RepositoryError>>;
  abstract revokeAllForUser(
    userId: number,
  ): Promise<Result<void, RepositoryError>>;
  abstract deleteExpired(): Promise<Result<number, RepositoryError>>;
}
