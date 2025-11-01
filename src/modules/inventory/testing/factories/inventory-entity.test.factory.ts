// src/modules/inventory/testing/factories/inventory-entity.test.factory.ts
import { InventoryEntity } from '../../infrastructure/orm/inventory.schema';

export class InventoryEntityTestFactory {
  static createInventoryEntity(
    overrides?: Partial<InventoryEntity>,
  ): InventoryEntity {
    const defaultEntity: InventoryEntity = {
      id: 'IN0000001',
      productId: 'PR0000001',
      availableQuantity: 100,
      reservedQuantity: 10,
      totalQuantity: 110,
      lowStockThreshold: 10,
      createdAt: new Date('2025-01-01T10:00:00Z'),
      updatedAt: new Date('2025-01-01T10:00:00Z'),
      lastRestockDate: new Date('2025-01-01T09:00:00Z'),
    };

    return { ...defaultEntity, ...overrides };
  }

  static createInStockEntity(
    overrides?: Partial<InventoryEntity>,
  ): InventoryEntity {
    return this.createInventoryEntity({
      availableQuantity: 150,
      reservedQuantity: 5,
      totalQuantity: 155,
      ...overrides,
    });
  }

  static createLowStockEntity(
    overrides?: Partial<InventoryEntity>,
  ): InventoryEntity {
    return this.createInventoryEntity({
      availableQuantity: 8,
      reservedQuantity: 2,
      totalQuantity: 10,
      lowStockThreshold: 10,
      ...overrides,
    });
  }

  static createOutOfStockEntity(
    overrides?: Partial<InventoryEntity>,
  ): InventoryEntity {
    return this.createInventoryEntity({
      availableQuantity: 0,
      reservedQuantity: 3,
      totalQuantity: 3,
      ...overrides,
    });
  }

  static createZeroInventoryEntity(
    overrides?: Partial<InventoryEntity>,
  ): InventoryEntity {
    return this.createInventoryEntity({
      availableQuantity: 0,
      reservedQuantity: 0,
      totalQuantity: 0,
      lastRestockDate: null,
      ...overrides,
    });
  }

  static createEntityWithReservations(
    overrides?: Partial<InventoryEntity>,
  ): InventoryEntity {
    return this.createInventoryEntity({
      availableQuantity: 60,
      reservedQuantity: 40,
      totalQuantity: 100,
      ...overrides,
    });
  }

  static createEntityForProduct(
    productId: string,
    quantity: number = 100,
  ): InventoryEntity {
    return this.createInventoryEntity({
      productId,
      availableQuantity: quantity,
      reservedQuantity: 0,
      totalQuantity: quantity,
    });
  }

  static createInventoryEntities(count: number): InventoryEntity[] {
    return Array.from({ length: count }, (_, i) =>
      this.createInventoryEntity({
        id: `IN${(i + 1).toString().padStart(7, '0')}`,
        productId: `PR${(i + 1).toString().padStart(7, '0')}`,
        availableQuantity: (i + 1) * 20,
        reservedQuantity: i * 2,
        totalQuantity: (i + 1) * 20 + i * 2,
      }),
    );
  }

  static createRecentlyRestockedEntity(
    overrides?: Partial<InventoryEntity>,
  ): InventoryEntity {
    const now = new Date();
    return this.createInventoryEntity({
      availableQuantity: 250,
      lastRestockDate: now,
      updatedAt: now,
      ...overrides,
    });
  }

  static createEntityWithThreshold(
    threshold: number,
    quantity: number,
  ): InventoryEntity {
    return this.createInventoryEntity({
      availableQuantity: quantity,
      lowStockThreshold: threshold,
      reservedQuantity: 0,
      totalQuantity: quantity,
    });
  }

  static createEntityWithoutRestockDate(
    overrides?: Partial<InventoryEntity>,
  ): InventoryEntity {
    return this.createInventoryEntity({
      lastRestockDate: null,
      ...overrides,
    });
  }
}
