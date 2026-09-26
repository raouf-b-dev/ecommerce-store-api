// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { CartPresentationDTO } from '../queries/results/cart-presentation.result';
import { Result } from '../../../../../shared-kernel/domain/result';
import { QueryError } from '../../../../../shared-kernel/domain/exceptions/query.error';

export abstract class CartQueryService {
  abstract getById(
    cartId: number,
    authorizedUserId?: number,
  ): Promise<Result<CartPresentationDTO | null, QueryError>>;

  abstract getByUserId(
    userId: number,
    authorizedUserId?: number,
  ): Promise<Result<CartPresentationDTO | null, QueryError>>;
}
