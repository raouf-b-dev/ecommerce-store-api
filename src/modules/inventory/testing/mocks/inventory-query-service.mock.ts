// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { InventoryQueryService } from '../../core/application/ports/inventory-query.service';
import { Result } from '../../../../shared-kernel/domain/result';
import { InventoryListItemDTO } from '../../core/application/queries/results/inventory-list-item.result';

export class MockInventoryQueryService implements InventoryQueryService {
  list = jest.fn();
  getByProductId = jest.fn();

  mockSuccessfulList(items: InventoryListItemDTO[], total?: number): void {
    const listTotal = total ?? items.length;
    this.list.mockResolvedValue(
      Result.success({
        items,
        total: listTotal,
        page: 1,
        limit: 10,
        totalPages: Math.ceil(listTotal / 10) || 1,
      }),
    );
  }

  mockSuccessfulGetByProductId(item: InventoryListItemDTO | null): void {
    this.getByProductId.mockResolvedValue(Result.success(item));
  }

  reset(): void {
    this.list.mockReset();
    this.getByProductId.mockReset();
  }
}
