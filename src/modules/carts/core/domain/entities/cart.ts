// src/modules/carts/domain/entities/cart.ts
import { Result } from '../../../../../shared-kernel/domain/result';
import { DomainError } from '../../../../../shared-kernel/domain/exceptions/domain.error';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { ICartItem } from '../interfaces/cart-item.interface';
import { ICart } from '../interfaces/cart.interface';
import { CartItem, CartItemProps } from './cart-item';

export interface CartProps {
  id: number | null;
  customerId: number | null;
  sessionId: number | null;
  items: CartItemProps[];
  createdAt: Date | null;
  updatedAt: Date | null;
}

export class Cart implements ICart {
  private readonly _id: number | null;
  private _customerId: number | null;
  private _sessionId: number | null;
  private _items: CartItem[];
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: CartProps) {
    const validationResult = this.validateProps(props);
    if (validationResult.isFailure) throw validationResult.error;

    this._id = props.id ? props.id : null;
    this._customerId = props.customerId ? props.customerId : null;
    this._sessionId = props.sessionId ? props.sessionId : null;
    this._items = props.items.map((item) => CartItem.fromPrimitives(item));
    this._createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();
  }

  private validateProps(props: CartProps): Result<void, DomainError> {
    // ID is optional for new carts
    if (!props.customerId && !props.sessionId) {
      return ErrorFactory.DomainError(
        'Either customerId or sessionId must be provided',
      );
    }
    if (props.customerId && props.sessionId) {
      return ErrorFactory.DomainError(
        'Cart cannot have both customerId and sessionId',
      );
    }

    return Result.success(undefined);
  }

  private roundPrice(price: number): number {
    return Math.round(price * 100) / 100;
  }

  // Getters
  get id(): number | null {
    return this._id;
  }

  get customerId(): number | null {
    return this._customerId;
  }

  get sessionId(): number | null {
    return this._sessionId;
  }

  get items(): ICartItem[] {
    return this._items.map((item) => item.toPrimitives());
  }

  get itemCount(): number {
    return this._items.reduce((sum, item) => sum + item.quantity, 0);
  }

  get totalAmount(): number {
    const total = this._items.reduce((sum, item) => sum + item.subtotal, 0);
    return this.roundPrice(total);
  }

  get createdAt(): Date {
    return new Date(this._createdAt);
  }

  get updatedAt(): Date {
    return new Date(this._updatedAt);
  }

  // Business logic methods
  isEmpty(): boolean {
    return this._items.length === 0;
  }

  hasItem(productId: number): boolean {
    return this._items.some((item) => item.isSameProduct(productId));
  }

  findItem(productId: number): CartItem | undefined {
    return this._items.find((item) => item.isSameProduct(productId));
  }

  findItemById(itemId: number): CartItem | undefined {
    return this._items.find((item) => item.id === itemId);
  }

  addItem(
    productId: number,
    productName: string,
    price: number,
    quantity: number,
    imageUrl?: string,
  ): Result<void, DomainError> {
    const existingItem = this.findItem(productId);

    if (existingItem) {
      const increaseResult = existingItem.increaseQuantity(quantity);
      if (increaseResult.isFailure) return increaseResult;
    } else {
      try {
        const newItem = CartItem.create(
          productId,
          productName,
          price,
          quantity,
          imageUrl,
        );
        this._items.push(newItem);
      } catch (error) {
        if (error instanceof DomainError) {
          return Result.failure(error);
        }
        return ErrorFactory.DomainError('Failed to create cart item');
      }
    }

    this._updatedAt = new Date();
    return Result.success(undefined);
  }

  updateItemQuantity(
    productId: number,
    quantity: number,
  ): Result<void, DomainError> {
    const item = this.findItem(productId);

    if (!item) {
      return ErrorFactory.DomainError(
        `Item with product ID ${productId} not found in cart`,
      );
    }

    const updateResult = item.updateQuantity(quantity);
    if (updateResult.isFailure) return updateResult;

    this._updatedAt = new Date();
    return Result.success(undefined);
  }

  removeItem(productId: number): Result<void, DomainError> {
    const index = this._items.findIndex((item) =>
      item.isSameProduct(productId),
    );

    if (index === -1) {
      return ErrorFactory.DomainError(
        `Item with product ID ${productId} not found in cart`,
      );
    }

    this._items.splice(index, 1);
    this._updatedAt = new Date();
    return Result.success(undefined);
  }

  removeItemById(itemId: number): Result<void, DomainError> {
    const index = this._items.findIndex((item) => item.id === itemId);

    if (index === -1) {
      return ErrorFactory.DomainError(
        `Item with ID ${itemId} not found in cart`,
      );
    }

    this._items.splice(index, 1);
    this._updatedAt = new Date();
    return Result.success(undefined);
  }

  clearItems(): void {
    this._items = [];
    this._updatedAt = new Date();
  }

  mergeItems(otherItems: CartItem[]): Result<void, DomainError> {
    for (const otherItem of otherItems) {
      const existingItem = this.findItem(otherItem.productId);

      if (existingItem) {
        const increaseResult = existingItem.increaseQuantity(
          otherItem.quantity,
        );
        if (increaseResult.isFailure) return increaseResult;
      } else {
        try {
          const newItem = CartItem.create(
            otherItem.productId,
            otherItem.productName,
            otherItem.price,
            otherItem.quantity,
            otherItem.imageUrl || undefined,
          );
          this._items.push(newItem);
        } catch (error) {
          if (error instanceof DomainError) {
            return Result.failure(error);
          }
          return ErrorFactory.DomainError('Failed to merge cart items');
        }
      }
    }

    this._updatedAt = new Date();
    return Result.success(undefined);
  }

  convertToUserCart(customerId: number): Result<void, DomainError> {
    if (!customerId) {
      return ErrorFactory.DomainError('Customer ID is required');
    }
    if (this._customerId) {
      return ErrorFactory.DomainError(
        'Cart is already associated with a customer',
      );
    }

    this._customerId = customerId;
    this._sessionId = null;
    this._updatedAt = new Date();
    return Result.success(undefined);
  }

  isGuestCart(): boolean {
    return this._sessionId !== null && this._customerId === null;
  }

  isUserCart(): boolean {
    return this._customerId !== null && this._sessionId === null;
  }

  // Serialization
  toPrimitives(): ICart {
    return {
      id: this._id,
      customerId: this._customerId,
      sessionId: this._sessionId,
      items: this._items.map((item) => item.toPrimitives()),
      itemCount: this.itemCount,
      totalAmount: this.totalAmount,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  getItems(): CartItem[] {
    return this._items;
  }

  static fromPrimitives(data: CartProps): Cart {
    return new Cart(data);
  }

  get props(): CartProps {
    return {
      id: this._id,
      customerId: this._customerId,
      sessionId: this._sessionId,
      items: this._items,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  static create(props: Omit<CartProps, 'createdAt' | 'updatedAt'>): Cart {
    return new Cart({
      ...props,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static createGuestCart(sessionId: number): Cart {
    return new Cart({
      id: null,
      customerId: null,
      sessionId,
      items: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }

  static createUserCart(customerId: number): Cart {
    return new Cart({
      id: null,
      customerId,
      sessionId: null,
      items: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}
