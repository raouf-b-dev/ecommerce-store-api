// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { CategoryQueryService } from '../../core/application/ports/category-query.service';
import { Result } from '../../../../shared-kernel/domain/result';
import { CategoryResult } from '../../core/application/queries/results/category.result';

export class MockCategoryQueryService implements CategoryQueryService {
  list = jest.fn();
  getById = jest.fn();

  mockSuccessfulList(items: CategoryResult[]): void {
    this.list.mockResolvedValue(Result.success(items));
  }

  mockSuccessfulGetById(item: CategoryResult | null): void {
    this.getById.mockResolvedValue(Result.success(item));
  }

  reset(): void {
    this.list.mockReset();
    this.getById.mockReset();
  }
}
