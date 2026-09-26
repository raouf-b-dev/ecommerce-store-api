// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { Result } from '../../../../shared-kernel/domain/result';
import { InfrastructureError } from 'src/shared-kernel/domain/exceptions/infrastructure-error';
import {
  CartInventoryGateway,
  StockCheckResult,
} from '../../core/application/ports/inventory.gateway';

export class MockCartInventoryGateway implements CartInventoryGateway {
  checkStock = jest.fn<
    Promise<Result<StockCheckResult, InfrastructureError>>,
    [number, number]
  >();

  mockSuccessfulCheckStock(result: StockCheckResult): void {
    this.checkStock.mockResolvedValue(Result.success(result));
  }

  mockCheckStockError(error: InfrastructureError): void {
    this.checkStock.mockResolvedValue(Result.failure(error));
  }

  reset(): void {
    jest.clearAllMocks();
  }

  verifyNoUnexpectedCalls(): void {
    expect(this.checkStock).not.toHaveBeenCalled();
  }
}
