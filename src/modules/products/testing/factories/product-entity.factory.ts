// src/modules/products/testing/factories/product-entity.factory.ts
import { ProductEntity } from '../../secondary-adapters/orm/product.schema';

/**
 * Factory for creating ProductEntity mocks for testing
 */
export class ProductEntityTestFactory {
  static createProductEntity(
    overrides?: Partial<ProductEntity>,
  ): ProductEntity {
    const defaultEntity: ProductEntity = {
      id: 1,
      name: 'Test Product',
      slug: 'test-product',
      description: 'A test product for unit tests',
      price: 100,
      currency: 'USD',
      sku: 'TEST-001',
      isActive: true,
      version: 1,
      createdAt: new Date('2025-01-01T10:00:00Z'),
      updatedAt: new Date('2025-01-01T10:00:00Z'),
    };

    return { ...defaultEntity, ...overrides };
  }

  /**
   * Creates multiple ProductEntities
   */
  static createProductEntities(
    productIds: number[],
    baseOverrides?: Partial<ProductEntity>,
  ): ProductEntity[] {
    return productIds.map((id) =>
      this.createProductEntity({
        id,
        name: `Product ${id}`,
        slug: `product-${id}`,
        sku: `SKU-${id}`,
        ...baseOverrides,
      }),
    );
  }

  /**
   * Creates a ProductEntity with low stock
   */
  static createLowStockProduct(
    overrides?: Partial<ProductEntity>,
  ): ProductEntity {
    return this.createProductEntity({
      ...overrides,
    });
  }

  /**
   * Creates a ProductEntity with no stock
   */
  static createOutOfStockProduct(
    overrides?: Partial<ProductEntity>,
  ): ProductEntity {
    return this.createProductEntity({
      ...overrides,
    });
  }
}
