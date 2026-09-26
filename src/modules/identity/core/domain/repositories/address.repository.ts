// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { Address } from '../entities/address';
import { Result } from 'src/shared-kernel/domain/result';
import { RepositoryError } from 'src/shared-kernel/domain/exceptions/repository.error';

export abstract class AddressRepository {
  abstract findById(
    id: number,
  ): Promise<Result<Address | null, RepositoryError>>;
  abstract findByUserId(
    userId: number,
  ): Promise<Result<Address[] | null, RepositoryError>>;
  abstract findDefaultAddress(
    userId: number,
  ): Promise<Result<Address | null, RepositoryError>>;
  abstract create(address: Address): Promise<Result<void, RepositoryError>>;
  abstract update(address: Address): Promise<Result<void, RepositoryError>>;
  abstract delete(id: number): Promise<Result<void, RepositoryError>>;
}
