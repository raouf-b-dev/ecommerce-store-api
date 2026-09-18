import { Result } from '../../../../../shared-kernel/domain/result';
import { DomainError } from '../../../../../shared-kernel/domain/exceptions/domain.error';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { Quantity } from '../../../../../shared-kernel/domain/value-objects/quantity';
import { Money } from '../../../../../shared-kernel/domain/value-objects/money';
import { ICartItem } from '../interfaces/cart-item.interface';

export interface CartItemProps {
  id: number | null;
  productId: number;
  productName: string;
  price: number;
  currency: string;
  quantity: number;
  imageUrl: string | null;
}

export class CartItem implements ICartItem {
  private _id: number | null;
  private readonly _productId: number;
  private _productName: string;
  private _unitPrice: Money;
  private _quantity: Quantity;
  private _imageUrl: string | null;

  constructor(props: CartItemProps) {
    const validationResult = this.validateProps(props);
    if (validationResult.isFailure) throw validationResult.error;

    this._id = props.id || null;
    this._productId = props.productId;
    this._productName = props.productName.trim();
    this._unitPrice = new Money(props.price, props.currency);
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
    const currency = props.currency?.trim();
    if (!currency) {
      return ErrorFactory.DomainError('Currency is required');
    }
    if (currency.length !== 3) {
      return ErrorFactory.DomainError(
        'Currency must be a 3-letter code (ISO 4217)',
      );
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
    return this._unitPrice.amount;
  }

  get currency(): string {
    return this._unitPrice.currency;
  }

  get quantity(): number {
    return this._quantity.value;
  }

  get imageUrl(): string | null {
    return this._imageUrl;
  }

  get subtotal(): number {
    const lineTotal = this._unitPrice.multiply(this._quantity.value);
    if (lineTotal.isFailure) {
      throw lineTotal.error;
    }
    return lineTotal.value.amount;
  }

  updateQuantity(quantityNumber: number): Result<void, DomainError> {
    if (quantityNumber <= 0) {
      return ErrorFactory.DomainError('Quantity must be greater than zero');
    }

    const quantityResult = this.createQuantity(quantityNumber);
    if (quantityResult.isFailure) return quantityResult;

    this._quantity = quantityResult.value;
    return Result.success(undefined);
  }

  increaseQuantity(amount: number): Result<void, DomainError> {
    if (amount <= 0) {
      return ErrorFactory.DomainError(
        'Increase amount must be greater than zero',
      );
    }
    return this.updateQuantity(this._quantity.value + amount);
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
    try {
      this._unitPrice = new Money(price, this._unitPrice.currency);
      return Result.success(undefined);
    } catch (error) {
      if (error instanceof DomainError) {
        return Result.failure(error);
      }
      return ErrorFactory.DomainError('Invalid price value');
    }
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
    try {
      this._unitPrice = new Money(price, this._unitPrice.currency);
    } catch (error) {
      if (error instanceof DomainError) {
        return Result.failure(error);
      }
      return ErrorFactory.DomainError('Invalid price value');
    }
    if (imageUrl !== undefined) {
      this._imageUrl = imageUrl?.trim() || null;
    }

    return Result.success(undefined);
  }

  isSameProduct(productId: number): boolean {
    return this._productId === productId;
  }

  toPrimitives(): ICartItem {
    return {
      id: this._id,
      productId: this._productId,
      productName: this._productName,
      price: this._unitPrice.amount,
      currency: this._unitPrice.currency,
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
      price: this._unitPrice.amount,
      currency: this._unitPrice.currency,
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
    currency: string,
    imageUrl?: string,
  ): CartItem {
    return new CartItem({
      id: null,
      productId,
      productName,
      price,
      currency,
      quantity,
      imageUrl: imageUrl || null,
    });
  }
}
