// src/modules/products/testing/factories/product.factory.ts
import { IProduct } from '../../domain/interfaces/product.interface';

export class ProductTestFactory {
  /**
   * Creates a complete mock product with all fields populated
   */
  static createMockProduct(overrides?: Partial<IProduct>): IProduct {
    const baseProduct: IProduct = {
      id: 'PR0000001',
      name: 'Test Product',
      description: 'A test product for testing purposes',
      price: 100,
      sku: 'TEST-001',
      stockQuantity: 10,
      createdAt: new Date('2025-01-01T10:00:00Z'),
      updatedAt: new Date('2025-01-01T10:00:00Z'),
    };

    return { ...baseProduct, ...overrides };
  }

  /**
   * Creates product with specific stock levels
   */
  static createInStockProduct(overrides?: Partial<IProduct>): IProduct {
    return this.createMockProduct({
      stockQuantity: 50,
      ...overrides,
    });
  }

  static createLowStockProduct(overrides?: Partial<IProduct>): IProduct {
    return this.createMockProduct({
      stockQuantity: 3,
      ...overrides,
    });
  }

  static createOutOfStockProduct(overrides?: Partial<IProduct>): IProduct {
    return this.createMockProduct({
      stockQuantity: 0,
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
      stockQuantity: 5,
      ...overrides,
    });
  }

  static createExpensiveProduct(overrides?: Partial<IProduct>): IProduct {
    return this.createMockProduct({
      name: 'Luxury Car',
      description: 'A fast red sports car',
      price: 35000,
      sku: 'CAR-001',
      stockQuantity: 2,
      ...overrides,
    });
  }

  /**
   * Creates product without optional fields
   */
  static createMinimalProduct(overrides?: Partial<IProduct>): IProduct {
    return this.createMockProduct({
      description: undefined,
      sku: undefined,
      ...overrides,
    });
  }

  /**
   * Creates multiple products with sequential IDs
   */
  static createProductList(count: number = 5): IProduct[] {
    return Array.from({ length: count }, (_, i) => ({
      id: `PR${String(i + 1).padStart(7, '0')}`,
      name: `Product ${i + 1}`,
      description: `Description for product ${i + 1}`,
      price: (i + 1) * 10,
      sku: `SKU-${String(i + 1).padStart(3, '0')}`,
      stockQuantity: (i + 1) * 5,
      createdAt: new Date('2025-01-01T10:00:00Z'),
      updatedAt: new Date('2025-01-01T10:00:00Z'),
    }));
  }

  /**
   * Creates products with specific categories/types
   */
  static createElectronicsProduct(overrides?: Partial<IProduct>): IProduct {
    return this.createMockProduct({
      name: 'Smartphone',
      description: 'Latest model smartphone',
      price: 699.99,
      sku: 'ELEC-001',
      stockQuantity: 25,
      ...overrides,
    });
  }

  static createClothingProduct(overrides?: Partial<IProduct>): IProduct {
    return this.createMockProduct({
      name: 'T-Shirt',
      description: 'Cotton t-shirt, size M',
      price: 24.99,
      sku: 'CLOTH-001',
      stockQuantity: 100,
      ...overrides,
    });
  }

  static createFoodProduct(overrides?: Partial<IProduct>): IProduct {
    return this.createMockProduct({
      name: 'Organic Coffee',
      description: 'Premium arabica coffee beans',
      price: 15.99,
      sku: 'FOOD-001',
      stockQuantity: 50,
      ...overrides,
    });
  }
}
