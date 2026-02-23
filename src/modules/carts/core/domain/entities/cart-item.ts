// src/modules/carts/domain/entities/cart-item.ts
import { Result } from '../../../../../shared-kernel/domain/result';
import { DomainError } from '../../../../../shared-kernel/errors/domain.error';
import { ErrorFactory } from '../../../../../shared-kernel/errors/error.factory';
import { Quantity } from '../../../../../shared-kernel/domain/value-objects/quantity';
import { ICartItem } from '../interfaces/cart-item.interface';

export interface CartItemProps {
  id: number | null;
  productId: number;
  productName: string;
  price: number;
  quantity: number;
  imageUrl: string | null;
}

export class CartItem implements ICartItem {
  private _id: number | null;
  private readonly _productId: number;
  private _productName: string;
  private _price: number;
  private _quantity: Quantity;
  private _imageUrl: string | null;

  constructor(props: CartItemProps) {
    const validationResult = this.validateProps(props);
    if (validationResult.isFailure) throw validationResult.error;

    this._id = props.id || null;
    this._productId = props.productId;
    this._productName = props.productName.trim();
    this._price = this.roundPrice(props.price);
    this._quantity = Quantity.from(props.quantity);
    this._imageUrl = props.imageUrl?.trim() || null;
  }

  private validateProps(props: CartItemProps): Result<void, DomainError> {
    if (!props.productId) {
      return ErrorFactory.DomainError('Product ID is required');
    }
    if (!props.productName?.trim()) {
      return ErrorFactory.DomainError('Product name is required');
    }
    if (props.price < 0) {
      return ErrorFactory.DomainError('Price cannot be negative');
    }
    if (props.quantity <= 0) {
      return ErrorFactory.DomainError('Quantity must be greater than zero');
    }

    return Result.success(undefined);
  }

  private roundPrice(price: number): number {
    return Math.round(price * 100) / 100;
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

  get productName(): string {
    return this._productName;
  }

  get price(): number {
    return this._price;
  }

  get quantity(): number {
    return this._quantity.value;
  }

  get imageUrl(): string | null {
    return this._imageUrl;
  }

  get subtotal(): number {
    return this.roundPrice(this._price * this._quantity.value);
  }

  // Business logic methods
  updateQuantity(quantityNumber: number): Result<void, DomainError> {
    if (quantityNumber <= 0) {
      return ErrorFactory.DomainError('Quantity must be greater than zero');
    }

    const quantityResult = this.createQuantity(quantityNumber);
    if (quantityResult.isFailure) return quantityResult;

    this._quantity = quantityResult.value;
    return Result.success(undefined);
  }

  increaseQuantity(amount: number = 1): Result<void, DomainError> {
    if (amount <= 0) {
      return ErrorFactory.DomainError('Amount must be greater than zero');
    }

    const amountQuantityResult = this.createQuantity(amount);
    if (amountQuantityResult.isFailure) return amountQuantityResult;

    this._quantity = this._quantity.add(amountQuantityResult.value);
    return Result.success(undefined);
  }

  decreaseQuantity(amount: number = 1): Result<void, DomainError> {
    if (amount <= 0) {
      return ErrorFactory.DomainError('Amount must be greater than zero');
    }

    const newQuantity = this._quantity.value - amount;
    if (newQuantity <= 0) {
      return ErrorFactory.DomainError('Quantity cannot be zero or negative');
    }

    const quantityResult = this.createQuantity(newQuantity);
    if (quantityResult.isFailure) return quantityResult;

    this._quantity = quantityResult.value;
    return Result.success(undefined);
  }

  updatePrice(price: number): Result<void, DomainError> {
    if (price < 0) {
      return ErrorFactory.DomainError('Price cannot be negative');
    }
    this._price = this.roundPrice(price);
    return Result.success(undefined);
  }

  updateProductInfo(
    name: string,
    price: number,
    imageUrl?: string,
  ): Result<void, DomainError> {
    if (!name?.trim()) {
      return ErrorFactory.DomainError('Product name cannot be empty');
    }
    if (price < 0) {
      return ErrorFactory.DomainError('Price cannot be negative');
    }

    this._productName = name.trim();
    this._price = this.roundPrice(price);
    if (imageUrl !== undefined) {
      this._imageUrl = imageUrl?.trim() || null;
    }

    return Result.success(undefined);
  }

  isSameProduct(productId: number): boolean {
    return this._productId === productId;
  }

  // Serialization
  toPrimitives(): ICartItem {
    return {
      id: this._id,
      productId: this._productId,
      productName: this._productName,
      price: this._price,
      quantity: this._quantity.value,
      subtotal: this.subtotal,
      imageUrl: this._imageUrl,
    };
  }

  get props(): CartItemProps {
    return {
      id: this._id,
      productId: this._productId,
      productName: this._productName,
      price: this._price,
      quantity: this._quantity.value,
      imageUrl: this._imageUrl,
    };
  }

  static fromPrimitives(data: CartItemProps): CartItem {
    return new CartItem(data);
  }

  static create(
    productId: number,
    productName: string,
    price: number,
    quantity: number,
    imageUrl?: string,
  ): CartItem {
    return new CartItem({
      id: null,
      productId,
      productName,
      price,
      quantity,
      imageUrl: imageUrl || null,
    });
  }
}
