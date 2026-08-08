// src/modules/inventory/testing/builders/inventory.test.builder.ts
import { IInventory } from '../../core/domain/interfaces/inventory.interface';
import { InventoryTestFactory } from '../factories/inventory.test.factory';

export class InventoryBuilder {
  private inventory: IInventory;

  constructor() {
    this.inventory = InventoryTestFactory.createMockInventory();
  }

  withId(id: number): this {
    this.inventory.id = id;
    return this;
  }

  withProductId(productId: number): this {
    this.inventory.productId = productId;
    return this;
  }

  withAvailableQuantity(quantity: number): this {
    this.inventory.availableQuantity = quantity;
    return this;
  }

  withReservedQuantity(quantity: number): this {
    this.inventory.reservedQuantity = quantity;
    return this;
  }

  withLowStockThreshold(threshold: number): this {
    this.inventory.lowStockThreshold = threshold;
    return this;
  }

  withLastRestockDate(date: Date | null): this {
    this.inventory.lastRestockDate = date;
    return this;
  }

  withCreatedAt(date: Date): this {
    this.inventory.createdAt = date;
    return this;
  }

  withUpdatedAt(date: Date): this {
    this.inventory.updatedAt = date;
    return this;
  }

  asInStock(): this {
    return this.withAvailableQuantity(100).withReservedQuantity(10);
  }

  asLowStock(): this {
    return this.withAvailableQuantity(5)
      .withReservedQuantity(2)
      .withLowStockThreshold(10);
  }

  asOutOfStock(): this {
    return this.withAvailableQuantity(0).withReservedQuantity(5);
  }

  asZeroInventory(): this {
    return this.withAvailableQuantity(0)
      .withReservedQuantity(0)
      .withLastRestockDate(null);
  }

  withHighReservations(): this {
    return this.withAvailableQuantity(50).withReservedQuantity(45);
  }

  asRecentlyRestocked(): this {
    return this.withAvailableQuantity(200).withLastRestockDate(new Date());
  }

  withNoReservations(): this {
    return this.withReservedQuantity(0);
  }

  build(): IInventory {
    return { ...this.inventory };
  }
}
