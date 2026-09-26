// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { CartQueryService } from '../../core/application/ports/cart-query.service';
import { Result } from '../../../../shared-kernel/domain/result';
import { CartPresentationDTO } from '../../core/application/queries/results/cart-presentation.result';

export class MockCartQueryService implements CartQueryService {
  getById = jest.fn();
  getByUserId = jest.fn();

  mockSuccessfulGetById(cart: CartPresentationDTO | null): void {
    this.getById.mockResolvedValue(Result.success(cart));
  }

  mockSuccessfulGetByUserId(cart: CartPresentationDTO | null): void {
    this.getByUserId.mockResolvedValue(Result.success(cart));
  }

  reset(): void {
    this.getById.mockReset();
    this.getByUserId.mockReset();
  }
}
