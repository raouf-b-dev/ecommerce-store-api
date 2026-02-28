// src/modules/products/testing/factories/create-product-dto.factory.ts

import { CreateProductDto } from '../../primary-adapters/dto/create-product.dto';

export class CreateProductDtoFactory {
  static createMockDto(
    overrides?: Partial<CreateProductDto>,
  ): CreateProductDto {
    const baseDto: CreateProductDto = {
      name: 'Test Product',
      description: 'A test product description',
      price: 100,
      sku: 'TEST-001',
    };

    return { ...baseDto, ...overrides };
  }

  static createExpensiveProductDto(
    overrides?: Partial<CreateProductDto>,
  ): CreateProductDto {
    return this.createMockDto({
      name: 'Luxury Car',
      description: 'A fast red sports car',
      price: 35000,
      sku: 'CAR-001',
      ...overrides,
    });
  }

  static createBudgetProductDto(
    overrides?: Partial<CreateProductDto>,
  ): CreateProductDto {
    return this.createMockDto({
      name: 'Budget Item',
      price: 9.99,
      ...overrides,
    });
  }

  static createMinimalDto(): CreateProductDto {
    return {
      name: 'Minimal Product',
      price: 50,
    };
  }

  static createHighStockDto(
    overrides?: Partial<CreateProductDto>,
  ): CreateProductDto {
    return this.createMockDto({
      ...overrides,
    });
  }

  static createLowStockDto(
    overrides?: Partial<CreateProductDto>,
  ): CreateProductDto {
    return this.createMockDto({
      ...overrides,
    });
  }

  static createInvalidDto(): CreateProductDto {
    return {
      name: '',
      price: -10,
      sku: '',
    };
  }

  static createFreeProductDto(
    overrides?: Partial<CreateProductDto>,
  ): CreateProductDto {
    return this.createMockDto({
      name: 'Free Sample',
      price: 0,
      ...overrides,
    });
  }
}
