// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { ProductData } from '../../core/application/ports/product.gateway';

export class CartGatewayDtoFactory {
  static createProductData(overrides?: Partial<ProductData>): ProductData {
    const baseProduct: ProductData = {
      id: 1,
      name: 'Test Product',
      price: 29.99,
      currency: 'USD',
      imageUrl: null,
    };

    return { ...baseProduct, ...overrides };
  }
}
