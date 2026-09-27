// src/modules/products/testing/factories/update-product-input.factory.ts

import { UpdateProductCommand } from '../../core/application/commands/update-product.command';

export class UpdateProductInputFactory {
  /**
   * Creates a valid UpdateProductCommand for testing
   */
  static createMockDto(
    overrides?: Partial<UpdateProductCommand>,
  ): UpdateProductCommand {
    const baseDto: UpdateProductCommand = {
      id: 1,
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
  static createNameOnlyDto(name: string): UpdateProductCommand {
    return { id: 1, name };
  }

  /**
   * Creates DTO updating only price
   */
  static createPriceOnlyDto(price: number): UpdateProductCommand {
    return { id: 1, price };
  }

  /**
   * Creates DTO updating only description
   */
  static createDescriptionOnlyDto(description: string): UpdateProductCommand {
    return { id: 1, description };
  }

  /**
   * Creates DTO updating only SKU
   */
  static createSkuOnlyDto(sku: string): UpdateProductCommand {
    return { id: 1, sku };
  }

  /**
   * Creates DTO with price increase
   */
  static createPriceIncreaseDto(
    currentPrice: number,
    increasePercent: number,
  ): UpdateProductCommand {
    return {
      id: 1,
      price: currentPrice * (1 + increasePercent / 100),
    };
  }

  /**
   * Creates DTO with price decrease
   */
  static createPriceDecreaseDto(
    currentPrice: number,
    discountPercent: number,
  ): UpdateProductCommand {
    return {
      id: 1,
      price: currentPrice * (1 - discountPercent / 100),
    };
  }

  /**
   * Creates invalid DTO for negative testing
   */
  static createInvalidDto(): UpdateProductCommand {
    return {
      id: 1,
      name: '', // Invalid - empty name
      price: -50, // Invalid - negative price
    };
  }
}
