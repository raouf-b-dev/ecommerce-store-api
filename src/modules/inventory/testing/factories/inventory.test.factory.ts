// src/modules/inventory/testing/factories/inventory.test.factory.ts
import { IInventory } from '../../domain/interfaces/inventory.interface';

export class InventoryTestFactory {
  static createMockInventory(overrides?: Partial<IInventory>): IInventory {
    const baseInventory: IInventory = {
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

    return { ...baseInventory, ...overrides };
  }

  static createInStockInventory(overrides?: Partial<IInventory>): IInventory {
    return this.createMockInventory({
      availableQuantity: 100,
      reservedQuantity: 10,
      totalQuantity: 110,
      ...overrides,
    });
  }

  static createLowStockInventory(overrides?: Partial<IInventory>): IInventory {
    return this.createMockInventory({
      availableQuantity: 5,
      reservedQuantity: 2,
      totalQuantity: 7,
      lowStockThreshold: 10,
      ...overrides,
    });
  }

  static createOutOfStockInventory(
    overrides?: Partial<IInventory>,
  ): IInventory {
    return this.createMockInventory({
      availableQuantity: 0,
      reservedQuantity: 5,
      totalQuantity: 5,
      ...overrides,
    });
  }

  static createZeroInventory(overrides?: Partial<IInventory>): IInventory {
    return this.createMockInventory({
      availableQuantity: 0,
      reservedQuantity: 0,
      totalQuantity: 0,
      lastRestockDate: null,
      ...overrides,
    });
  }

  static createInventoryWithReservations(
    overrides?: Partial<IInventory>,
  ): IInventory {
    return this.createMockInventory({
      availableQuantity: 50,
      reservedQuantity: 20,
      totalQuantity: 70,
      ...overrides,
    });
  }

  static createInventoryForProduct(
    productId: string,
    quantity: number = 100,
  ): IInventory {
    return this.createMockInventory({
      productId,
      availableQuantity: quantity,
      reservedQuantity: 0,
      totalQuantity: quantity,
    });
  }

  static createMultipleInventories(count: number): IInventory[] {
    return Array.from({ length: count }, (_, i) =>
      this.createMockInventory({
        id: `IN${(i + 1).toString().padStart(7, '0')}`,
        productId: `PR${(i + 1).toString().padStart(7, '0')}`,
        availableQuantity: (i + 1) * 10,
        reservedQuantity: i,
        totalQuantity: (i + 1) * 10 + i,
      }),
    );
  }

  static createRecentlyRestockedInventory(
    overrides?: Partial<IInventory>,
  ): IInventory {
    return this.createMockInventory({
      availableQuantity: 200,
      lastRestockDate: new Date(),
      ...overrides,
    });
  }

  static createInventoryWithCustomThreshold(
    threshold: number,
    quantity: number,
  ): IInventory {
    return this.createMockInventory({
      availableQuantity: quantity,
      lowStockThreshold: threshold,
    });
  }
}
