// src/modules/inventory/domain/entities/inventory.entity.ts
import { Result } from '../../../../../shared-kernel/domain/result';
import { DomainError } from '../../../../../shared-kernel/errors/domain.error';
import { ErrorFactory } from '../../../../../shared-kernel/errors/error.factory';
import { Quantity } from '../../../../../shared-kernel/domain/value-objects/quantity';
import { IInventory } from '../interfaces/inventory.interface';

export interface InventoryProps {
  id: number | null;
  productId: number;
  availableQuantity: number;
  reservedQuantity: number;
  lowStockThreshold: number;
  createdAt: Date | null;
  updatedAt: Date | null;
  lastRestockDate: Date | null;
}

export class Inventory implements IInventory {
  private readonly _id: number | null;
  private readonly _productId: number;
  private _availableQuantity: Quantity;
  private _reservedQuantity: Quantity;
  private _lowStockThreshold: Quantity;
  private readonly _createdAt: Date;
  private _updatedAt: Date;
  private _lastRestockDate: Date | null;

  constructor(props: InventoryProps) {
    const validationResult = this.validateProps(props);
    if (validationResult.isFailure) throw validationResult.error;

    this._id = props.id ? props.id : null;
    this._productId = props.productId;
    this._availableQuantity = Quantity.from(props.availableQuantity);
    this._reservedQuantity = Quantity.from(props.reservedQuantity);
    this._lowStockThreshold = Quantity.from(props.lowStockThreshold);
    this._createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();
    this._lastRestockDate = props.lastRestockDate;
  }

  private validateProps(props: InventoryProps): Result<void, DomainError> {
    // ID is optional for new inventory
    if (!props.productId) {
      return ErrorFactory.DomainError('Product ID is required');
    }
    if (props.availableQuantity < 0) {
      return ErrorFactory.DomainError('Available quantity cannot be negative');
    }
    if (props.reservedQuantity < 0) {
      return ErrorFactory.DomainError('Reserved quantity cannot be negative');
    }
    if (props.lowStockThreshold < 0) {
      return ErrorFactory.DomainError('Low stock threshold cannot be negative');
    }

    return Result.success(undefined);
  }

  private createQuantity(value: number): Result<Quantity, DomainError> {
    try {
      return Result.success(Quantity.from(value));
    } catch (error) {
      if (error instanceof DomainError) {
        return Result.failure(error);
      }
      return ErrorFactory.DomainError('Invalid quantity value');
    }
  }

  // Getters
  get id(): number | null {
    return this._id;
  }

  get productId(): number {
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
  isInStock(quantityNumber: number = 1): Result<boolean, DomainError> {
    const quantityResult = this.createQuantity(quantityNumber);
    if (quantityResult.isFailure) return quantityResult;

    const checkedQuantity = quantityResult.value;
    const isAvailable =
      this._availableQuantity.isPositive() &&
      this._availableQuantity >= checkedQuantity;

    return Result.success(isAvailable);
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

  canFulfillQuantity(quantityNumber: number): boolean {
    try {
      const quantity = Quantity.from(quantityNumber);
      return this._availableQuantity.isGreaterThanOrEqual(quantity);
    } catch {
      return false;
    }
  }

  // Stock management methods
  increaseStock(quantityNumber: number): Result<void, DomainError> {
    const quantityResult = this.createQuantity(quantityNumber);
    if (quantityResult.isFailure) return quantityResult;

    const quantity = quantityResult.value;
    if (!quantity.isPositive()) {
      return ErrorFactory.DomainError('Quantity to increase must be positive');
    }
    this._availableQuantity = this._availableQuantity.add(quantity);
    this._lastRestockDate = new Date();
    this._updatedAt = new Date();

    return Result.success(undefined);
  }

  decreaseStock(quantityNumber: number): Result<void, DomainError> {
    const quantityResult = this.createQuantity(quantityNumber);
    if (quantityResult.isFailure) return quantityResult;

    const quantity = quantityResult.value;
    if (!quantity.isPositive()) {
      return ErrorFactory.DomainError('Quantity to decrease must be positive');
    }
    if (!this.canFulfillQuantity(quantityNumber)) {
      return ErrorFactory.DomainError(
        `Insufficient stock. Available: ${this._availableQuantity.value}, Requested: ${quantity.value}`,
      );
    }
    const subtractQuantityResult = this._availableQuantity.subtract(quantity);
    if (subtractQuantityResult.isFailure) return subtractQuantityResult;

    this._availableQuantity = subtractQuantityResult.value;
    this._updatedAt = new Date();

    return Result.success(undefined);
  }

  setStock(quantityNumber: number): Result<void, DomainError> {
    const quantityResult = this.createQuantity(quantityNumber);
    if (quantityResult.isFailure) return quantityResult;

    const quantity = quantityResult.value;
    this._availableQuantity = quantity;
    this._updatedAt = new Date();

    return Result.success(undefined);
  }

  reserveStock(quantityNumber: number): Result<void, DomainError> {
    const quantityResult = this.createQuantity(quantityNumber);
    if (quantityResult.isFailure) return quantityResult;

    const quantity = quantityResult.value;
    if (!quantity.isPositive()) {
      return ErrorFactory.DomainError('Quantity to reserve must be positive');
    }
    if (!this.canFulfillQuantity(quantityNumber)) {
      return ErrorFactory.DomainError(
        `Insufficient stock to reserve. Available: ${this._availableQuantity.value}, Requested: ${quantity.value}`,
      );
    }
    const subtractQuantityResult = this._availableQuantity.subtract(quantity);
    if (subtractQuantityResult.isFailure) return subtractQuantityResult;
    this._availableQuantity = subtractQuantityResult.value;
    this._reservedQuantity = this._reservedQuantity.add(quantity);
    this._updatedAt = new Date();

    return Result.success(undefined);
  }

  releaseReservation(quantityNumber: number): Result<void, DomainError> {
    const quantityResult = this.createQuantity(quantityNumber);
    if (quantityResult.isFailure) return quantityResult;

    const quantity = quantityResult.value;
    if (!quantity.isPositive()) {
      return ErrorFactory.DomainError('Quantity to release must be positive');
    }
    if (this._reservedQuantity.isLessThan(quantity)) {
      return ErrorFactory.DomainError(
        `Cannot release more than reserved. Reserved: ${this._reservedQuantity.value}, Requested: ${quantity.value}`,
      );
    }
    const reservedQuantityResult = this._reservedQuantity.subtract(quantity);
    if (reservedQuantityResult.isFailure) return reservedQuantityResult;
    this._reservedQuantity = reservedQuantityResult.value;

    this._availableQuantity = this._availableQuantity.add(quantity);
    this._updatedAt = new Date();

    return Result.success(undefined);
  }

  confirmReservation(quantityNumber: number): Result<void, DomainError> {
    const quantityResult = this.createQuantity(quantityNumber);
    if (quantityResult.isFailure) return quantityResult;

    const quantity = quantityResult.value;
    if (!quantity.isPositive()) {
      return ErrorFactory.DomainError('Quantity to confirm must be positive');
    }
    if (this._reservedQuantity.isLessThan(quantity)) {
      return ErrorFactory.DomainError(
        `Cannot confirm more than reserved. Reserved: ${this._reservedQuantity.value}, Requested: ${quantity.value}`,
      );
    }
    const reservedQuantityResult = this._reservedQuantity.subtract(quantity);
    if (reservedQuantityResult.isFailure) return reservedQuantityResult;
    this._reservedQuantity = reservedQuantityResult.value;
    this._updatedAt = new Date();

    return Result.success(undefined);
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
    props: Omit<InventoryProps, 'id' | 'createdAt' | 'updatedAt'>,
  ): Inventory {
    return new Inventory({
      ...props,
      id: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static createForProduct(
    productId: number,
    initialQuantity: number = 0,
    lowStockThreshold: number = 10,
  ): Inventory {
    const props: InventoryProps = {
      id: null,
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
