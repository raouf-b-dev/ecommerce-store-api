// src/modules/products/testing/factories/update-product-dto.factory.ts

import { UpdateProductDto } from '../../primary-adapters/dto/update-product.dto';

export class UpdateProductDtoFactory {
  /**
   * Creates a valid UpdateProductDto for testing
   */
  static createMockDto(
    overrides?: Partial<UpdateProductDto>,
  ): UpdateProductDto {
    const baseDto: UpdateProductDto = {
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
  static createNameOnlyDto(name: string): UpdateProductDto {
    return { name };
  }

  /**
   * Creates DTO updating only price
   */
  static createPriceOnlyDto(price: number): UpdateProductDto {
    return { price };
  }

  /**
   * Creates DTO updating only description
   */
  static createDescriptionOnlyDto(description: string): UpdateProductDto {
    return { description };
  }

  /**
   * Creates DTO updating only SKU
   */
  static createSkuOnlyDto(sku: string): UpdateProductDto {
    return { sku };
  }

  /**
   * Creates DTO with price increase
   */
  static createPriceIncreaseDto(
    currentPrice: number,
    increasePercent: number,
  ): UpdateProductDto {
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
  ): UpdateProductDto {
    return {
      price: currentPrice * (1 - discountPercent / 100),
    };
  }

  /**
   * Creates invalid DTO for negative testing
   */
  static createInvalidDto(): UpdateProductDto {
    return {
      name: '', // Invalid - empty name
      price: -50, // Invalid - negative price
    };
  }
}
