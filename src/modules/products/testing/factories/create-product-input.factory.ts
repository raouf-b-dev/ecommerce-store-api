// src/modules/products/testing/factories/create-product-input.factory.ts

import { CreateProductCommand } from '../../core/application/commands/create-product.command';

export class CreateProductInputFactory {
  static createMockDto(
    overrides?: Partial<CreateProductCommand>,
  ): CreateProductCommand {
    const baseDto: CreateProductCommand = {
      name: 'Test Product',
      description: 'A test product description',
      price: 100,
      sku: 'TEST-001',
      categoryId: 1,
    };

    return { ...baseDto, ...overrides };
  }

  static createExpensiveProductDto(
    overrides?: Partial<CreateProductCommand>,
  ): CreateProductCommand {
    return this.createMockDto({
      name: 'Luxury Car',
      description: 'A fast red sports car',
      price: 35000,
      sku: 'CAR-001',
      ...overrides,
    });
  }

  static createBudgetProductDto(
    overrides?: Partial<CreateProductCommand>,
  ): CreateProductCommand {
    return this.createMockDto({
      name: 'Budget Item',
      price: 9.99,
      ...overrides,
    });
  }

  static createMinimalDto(): CreateProductCommand {
    return {
      name: 'Minimal Product',
      price: 50,
      categoryId: 1,
    };
  }

  static createInvalidDto(): CreateProductCommand {
    return {
      name: '',
      price: -10,
      sku: '',
    };
  }

  static createFreeProductDto(
    overrides?: Partial<CreateProductCommand>,
  ): CreateProductCommand {
    return this.createMockDto({
      name: 'Free Sample',
      price: 0,
      ...overrides,
    });
  }
}
