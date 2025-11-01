// src/modules/inventory/domain/entities/inventory.entity.ts
import { Quantity } from '../../../../shared/domain/value-objects/quantity';
import { IInventory } from '../interfaces/inventory.interface';

export interface InventoryProps {
  id: string;
  productId: string;
  availableQuantity: number;
  reservedQuantity: number;
  lowStockThreshold: number;
  createdAt: Date | null;
  updatedAt: Date | null;
  lastRestockDate: Date | null;
}

export class Inventory implements IInventory {
  private readonly _id: string;
  private readonly _productId: string;
  private _availableQuantity: Quantity;
  private _reservedQuantity: Quantity;
  private _lowStockThreshold: Quantity;
  private readonly _createdAt: Date;
  private _updatedAt: Date;
  private _lastRestockDate: Date | null;

  constructor(props: InventoryProps) {
    this.validateProps(props);

    this._id = props.id.trim();
    this._productId = props.productId.trim();
    this._availableQuantity = Quantity.from(props.availableQuantity);
    this._reservedQuantity = Quantity.from(props.reservedQuantity);
    this._lowStockThreshold = Quantity.from(props.lowStockThreshold);
    this._createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();
    this._lastRestockDate = props.lastRestockDate;
  }

  private validateProps(props: InventoryProps): void {
    if (!props.id?.trim()) {
      throw new Error('Inventory ID is required');
    }
    if (!props.productId?.trim()) {
      throw new Error('Product ID is required');
    }
    if (props.availableQuantity < 0) {
      throw new Error('Available quantity cannot be negative');
    }
    if (props.reservedQuantity < 0) {
      throw new Error('Reserved quantity cannot be negative');
    }
    if (props.lowStockThreshold < 0) {
      throw new Error('Low stock threshold cannot be negative');
    }
  }

  // Getters
  get id(): string {
    return this._id;
  }

  get productId(): string {
    return this._productId;
  }

  get availableQuantity(): number {
    return this._availableQuantity.value;
  }

  get reservedQuantity(): number {
    return this._reservedQuantity.value;
  }

  get totalQuantity(): number {
    return this._availableQuantity.add(this._reservedQuantity).value;
  }

  get lowStockThreshold(): number {
    return this._lowStockThreshold.value;
  }

  get createdAt(): Date {
    return new Date(this._createdAt);
  }

  get updatedAt(): Date {
    return new Date(this._updatedAt);
  }

  get lastRestockDate(): Date | null {
    return this._lastRestockDate ? new Date(this._lastRestockDate) : null;
  }

  // Business logic methods
  isInStock(): boolean {
    return this._availableQuantity.isPositive();
  }

  isOutOfStock(): boolean {
    return this._availableQuantity.isZero();
  }

  hasLowStock(): boolean {
    return (
      this._availableQuantity.isGreaterThan(Quantity.zero()) &&
      this._availableQuantity.isLessThanOrEqual(this._lowStockThreshold)
    );
  }

  canFulfillQuantity(quantity: Quantity): boolean {
    return this._availableQuantity.isGreaterThanOrEqual(quantity);
  }

  // Stock management methods
  increaseStock(quantity: Quantity): void {
    if (!quantity.isPositive()) {
      throw new Error('Quantity to increase must be positive');
    }
    this._availableQuantity = this._availableQuantity.add(quantity);
    this._lastRestockDate = new Date();
    this._updatedAt = new Date();
  }

  decreaseStock(quantity: Quantity): void {
    if (!quantity.isPositive()) {
      throw new Error('Quantity to decrease must be positive');
    }
    if (!this.canFulfillQuantity(quantity)) {
      throw new Error(
        `Insufficient stock. Available: ${this._availableQuantity.value}, Requested: ${quantity.value}`,
      );
    }
    this._availableQuantity = this._availableQuantity.subtract(quantity);
    this._updatedAt = new Date();
  }

  setStock(quantity: Quantity): void {
    this._availableQuantity = quantity;
    this._updatedAt = new Date();
  }

  reserveStock(quantity: Quantity): void {
    if (!quantity.isPositive()) {
      throw new Error('Quantity to reserve must be positive');
    }
    if (!this.canFulfillQuantity(quantity)) {
      throw new Error(
        `Insufficient stock to reserve. Available: ${this._availableQuantity.value}, Requested: ${quantity.value}`,
      );
    }
    this._availableQuantity = this._availableQuantity.subtract(quantity);
    this._reservedQuantity = this._reservedQuantity.add(quantity);
    this._updatedAt = new Date();
  }

  releaseReservation(quantity: Quantity): void {
    if (!quantity.isPositive()) {
      throw new Error('Quantity to release must be positive');
    }
    if (this._reservedQuantity.isLessThan(quantity)) {
      throw new Error(
        `Cannot release more than reserved. Reserved: ${this._reservedQuantity.value}, Requested: ${quantity.value}`,
      );
    }
    this._reservedQuantity = this._reservedQuantity.subtract(quantity);
    this._availableQuantity = this._availableQuantity.add(quantity);
    this._updatedAt = new Date();
  }

  confirmReservation(quantity: Quantity): void {
    if (!quantity.isPositive()) {
      throw new Error('Quantity to confirm must be positive');
    }
    if (this._reservedQuantity.isLessThan(quantity)) {
      throw new Error(
        `Cannot confirm more than reserved. Reserved: ${this._reservedQuantity.value}, Requested: ${quantity.value}`,
      );
    }
    this._reservedQuantity = this._reservedQuantity.subtract(quantity);
    this._updatedAt = new Date();
  }

  updateLowStockThreshold(threshold: Quantity): void {
    this._lowStockThreshold = threshold;
    this._updatedAt = new Date();
  }

  // Serialization
  toPrimitives(): IInventory {
    return {
      id: this._id,
      productId: this._productId,
      availableQuantity: this._availableQuantity.value,
      reservedQuantity: this._reservedQuantity.value,
      totalQuantity: this.totalQuantity,
      lowStockThreshold: this._lowStockThreshold.value,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
      lastRestockDate: this._lastRestockDate,
    };
  }

  static fromPrimitives(data: InventoryProps): Inventory {
    return new Inventory(data);
  }

  static create(
    props: Omit<InventoryProps, 'id' | 'createdAt' | 'updatedAt'> & {
      id: string;
    },
  ): Inventory {
    return new Inventory({
      ...props,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static createForProduct(
    id: string,
    productId: string,
    initialQuantity: number = 0,
    lowStockThreshold: number = 10,
  ): Inventory {
    const props: InventoryProps = {
      id,
      productId,
      availableQuantity: initialQuantity,
      reservedQuantity: 0,
      lowStockThreshold,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastRestockDate: null,
    };
    return new Inventory(props);
  }
}
