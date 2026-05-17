// src/modules/products/testing/factories/update-product-input.factory.ts

import { UpdateProductInput } from '../../core/domain/repositories/product-repository';

export class UpdateProductInputFactory {
  /**
   * Creates a valid UpdateProductInput for testing
   */
  static createMockDto(
    overrides?: Partial<UpdateProductInput>,
  ): UpdateProductInput {
    const baseDto: UpdateProductInput = {
      name: 'Updated Product',
      description: 'Updated description',
      price: 150,
      sku: 'UPD-001',
    };

    return { ...baseDto, ...overrides };
  }

  /**
   * Creates DTO updating only name
   */
  static createNameOnlyDto(name: string): UpdateProductInput {
    return { name };
  }

  /**
   * Creates DTO updating only price
   */
  static createPriceOnlyDto(price: number): UpdateProductInput {
    return { price };
  }

  /**
   * Creates DTO updating only description
   */
  static createDescriptionOnlyDto(description: string): UpdateProductInput {
    return { description };
  }

  /**
   * Creates DTO updating only SKU
   */
  static createSkuOnlyDto(sku: string): UpdateProductInput {
    return { sku };
  }

  /**
   * Creates DTO with price increase
   */
  static createPriceIncreaseDto(
    currentPrice: number,
    increasePercent: number,
  ): UpdateProductInput {
    return {
      price: currentPrice * (1 + increasePercent / 100),
    };
  }

  /**
   * Creates DTO with price decrease
   */
  static createPriceDecreaseDto(
    currentPrice: number,
    discountPercent: number,
  ): UpdateProductInput {
    return {
      price: currentPrice * (1 - discountPercent / 100),
    };
  }

  /**
   * Creates invalid DTO for negative testing
   */
  static createInvalidDto(): UpdateProductInput {
    return {
      name: '', // Invalid - empty name
      price: -50, // Invalid - negative price
    };
  }
}
