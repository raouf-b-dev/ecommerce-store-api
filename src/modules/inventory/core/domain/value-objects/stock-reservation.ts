// src/modules/inventory/domain/value-objects/stock-reservation.ts
import { Quantity } from '../../../../../shared-kernel/domain/value-objects/quantity';

export interface StockReservationProps {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  expiresAt: Date;
  createdAt: Date | null;
}

export class StockReservation {
  private readonly _id: string;
  private readonly _orderId: string;
  private readonly _productId: string;
  private readonly _quantity: Quantity;
  private readonly _expiresAt: Date;
  private readonly _createdAt: Date;

  constructor(props: StockReservationProps) {
    this.validateProps(props);

    this._id = props.id.trim();
    this._orderId = props.orderId.trim();
    this._productId = props.productId.trim();
    this._quantity = Quantity.from(props.quantity);
    this._expiresAt = props.expiresAt;
    this._createdAt = props.createdAt || new Date();
  }

  private validateProps(props: StockReservationProps): void {
    if (!props.id?.trim()) {
      throw new Error('Reservation ID is required');
    }
    if (!props.orderId?.trim()) {
      throw new Error('Order ID is required');
    }
    if (!props.productId?.trim()) {
      throw new Error('Product ID is required');
    }
    if (props.expiresAt <= new Date()) {
      throw new Error('Expiry date must be in the future');
    }
  }

  get id(): string {
    return this._id;
  }

  get orderId(): string {
    return this._orderId;
  }

  get productId(): string {
    return this._productId;
  }

  get quantity(): Quantity {
    return this._quantity;
  }

  get expiresAt(): Date {
    return new Date(this._expiresAt);
  }

  get createdAt(): Date {
    return new Date(this._createdAt);
  }

  isExpired(): boolean {
    return new Date() > this._expiresAt;
  }

  toPrimitives() {
    return {
      id: this._id,
      orderId: this._orderId,
      productId: this._productId,
      quantity: this._quantity.value,
      expiresAt: this._expiresAt,
      createdAt: this._createdAt,
    };
  }

  static create(
    id: string,
    orderId: string,
    productId: string,
    quantity: number,
    expirationMinutes: number = 30,
  ): StockReservation {
    const expiresAt = new Date();
    expiresAt.setMinutes(expiresAt.getMinutes() + expirationMinutes);

    return new StockReservation({
      id,
      orderId,
      productId,
      quantity,
      expiresAt,
      createdAt: new Date(),
    });
  }
}
