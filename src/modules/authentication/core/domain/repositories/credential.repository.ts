// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { Result } from '../../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import { Credential } from '../entities/credential';

export abstract class CredentialRepository {
  abstract save(
    credential: Credential,
  ): Promise<Result<Credential, RepositoryError>>;
  abstract findByUserId(
    userId: number,
  ): Promise<Result<Credential | null, RepositoryError>>;
  abstract update(
    credential: Credential,
  ): Promise<Result<void, RepositoryError>>;
  abstract deleteByUserId(
    userId: number,
  ): Promise<Result<void, RepositoryError>>;
}
