// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { Result } from '../../../../shared-kernel/domain/result';
import { InfrastructureError } from 'src/shared-kernel/domain/exceptions/infrastructure-error';
import {
  CartProductGateway,
  ProductData,
} from '../../core/application/ports/product.gateway';

export class MockCartProductGateway implements CartProductGateway {
  findById = jest.fn<
    Promise<Result<ProductData | null, InfrastructureError>>,
    [number]
  >();

  mockSuccessfulFindById(product: ProductData): void {
    this.findById.mockResolvedValue(Result.success(product));
  }

  mockProductNotFound(): void {
    this.findById.mockResolvedValue(Result.success(null));
  }

  mockFindByIdError(error: InfrastructureError): void {
    this.findById.mockResolvedValue(Result.failure(error));
  }

  reset(): void {
    jest.clearAllMocks();
  }

  verifyNoUnexpectedCalls(): void {
    expect(this.findById).not.toHaveBeenCalled();
  }
}
