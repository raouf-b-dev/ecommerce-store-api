// src/modules/products/testing/factories/product.factory.ts
import { IProduct } from '../../domain/interfaces/product.interface';

export class ProductTestFactory {
  static createMockProduct(overrides?: Partial<IProduct>): IProduct {
    const baseProduct: IProduct = {
      id: 1,
      name: 'Test Product',
      description: 'A test product for testing purposes',
      price: 100,
      sku: 'TEST-001',
      createdAt: new Date('2025-01-01T10:00:00Z'),
      updatedAt: new Date('2025-01-01T10:00:00Z'),
    };

    return { ...baseProduct, ...overrides };
  }

  static createInStockProduct(overrides?: Partial<IProduct>): IProduct {
    return this.createMockProduct({
      ...overrides,
    });
  }

  static createLowStockProduct(overrides?: Partial<IProduct>): IProduct {
    return this.createMockProduct({
      ...overrides,
    });
  }

  static createOutOfStockProduct(overrides?: Partial<IProduct>): IProduct {
    return this.createMockProduct({
      ...overrides,
    });
  }

  /**
   * Creates product with specific price ranges
   */
  static createBudgetProduct(overrides?: Partial<IProduct>): IProduct {
    return this.createMockProduct({
      name: 'Budget Product',
      price: 19.99,
      ...overrides,
    });
  }

  static createPremiumProduct(overrides?: Partial<IProduct>): IProduct {
    return this.createMockProduct({
      name: 'Premium Product',
      price: 999.99,
      ...overrides,
    });
  }

  static createExpensiveProduct(overrides?: Partial<IProduct>): IProduct {
    return this.createMockProduct({
      name: 'Luxury Car',
      description: 'A fast red sports car',
      price: 35000,
      sku: 'CAR-001',
      ...overrides,
    });
  }

  static createMinimalProduct(overrides?: Partial<IProduct>): IProduct {
    return this.createMockProduct({
      description: undefined,
      sku: undefined,
      ...overrides,
    });
  }

  static createProductList(count: number = 5): IProduct[] {
    return Array.from({ length: count }, (_, i) => ({
      id: i + 1,
      name: `Product ${i + 1}`,
      description: `Description for product ${i + 1}`,
      price: (i + 1) * 10,
      sku: `SKU-${String(i + 1).padStart(3, '0')}`,
      stockQuantity: (i + 1) * 5,
      createdAt: new Date('2025-01-01T10:00:00Z'),
      updatedAt: new Date('2025-01-01T10:00:00Z'),
    }));
  }

  static createElectronicsProduct(overrides?: Partial<IProduct>): IProduct {
    return this.createMockProduct({
      name: 'Smartphone',
      description: 'Latest model smartphone',
      price: 699.99,
      sku: 'ELEC-001',
      ...overrides,
    });
  }

  static createClothingProduct(overrides?: Partial<IProduct>): IProduct {
    return this.createMockProduct({
      name: 'T-Shirt',
      description: 'Cotton t-shirt, size M',
      price: 24.99,
      sku: 'CLOTH-001',
      ...overrides,
    });
  }

  static createFoodProduct(overrides?: Partial<IProduct>): IProduct {
    return this.createMockProduct({
      name: 'Organic Coffee',
      description: 'Premium arabica coffee beans',
      price: 15.99,
      sku: 'FOOD-001',
      ...overrides,
    });
  }
}
