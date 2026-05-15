// src/modules/products/testing/factories/create-product-input.factory.ts

import { CreateProductInput } from '../../core/domain/repositories/product-repository';

export class CreateProductInputFactory {
  static createMockDto(
    overrides?: Partial<CreateProductInput>,
  ): CreateProductInput {
    const baseDto: CreateProductInput = {
      name: 'Test Product',
      description: 'A test product description',
      price: 100,
      sku: 'TEST-001',
    };

    return { ...baseDto, ...overrides };
  }

  static createExpensiveProductDto(
    overrides?: Partial<CreateProductInput>,
  ): CreateProductInput {
    return this.createMockDto({
      name: 'Luxury Car',
      description: 'A fast red sports car',
      price: 35000,
      sku: 'CAR-001',
      ...overrides,
    });
  }

  static createBudgetProductDto(
    overrides?: Partial<CreateProductInput>,
  ): CreateProductInput {
    return this.createMockDto({
      name: 'Budget Item',
      price: 9.99,
      ...overrides,
    });
  }

  static createMinimalDto(): CreateProductInput {
    return {
      name: 'Minimal Product',
      price: 50,
    };
  }

  static createInvalidDto(): CreateProductInput {
    return {
      name: '',
      price: -10,
      sku: '',
    };
  }

  static createFreeProductDto(
    overrides?: Partial<CreateProductInput>,
  ): CreateProductInput {
    return this.createMockDto({
      name: 'Free Sample',
      price: 0,
      ...overrides,
    });
  }
}
