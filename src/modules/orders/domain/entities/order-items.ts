// src/modules/orders/domain/entities/order-item.entity.ts
import { Money } from '../value-objects/money';
import { Quantity } from '../value-objects/quantity';
import { v4 as uuidv4 } from 'uuid';

export interface OrderItemProps {
  id?: string;
  productId: string;
  productName?: string;
  unitPrice: number;
  quantity: number;
}

export class OrderItem {
  private readonly _id: string;
  private readonly _productId: string;
  private readonly _productName?: string;
  private readonly _unitPrice: Money;
  private readonly _quantity: Quantity;
  private readonly _lineTotal: Money;

  constructor(props: OrderItemProps) {
    if (!props.productId?.trim()) {
      throw new Error('Product ID is required');
    }

    this._id = props.id || this.generateId();
    this._productId = props.productId.trim();
    this._productName = props.productName?.trim();
    this._unitPrice = Money.from(props.unitPrice);
    this._quantity = Quantity.from(props.quantity);
    this._lineTotal = this._unitPrice.multiply(this._quantity.value);
  }

  get id(): string {
    return this._id;
  }

  get productId(): string {
    return this._productId;
  }

  get productName(): string | undefined {
    return this._productName;
  }

  get unitPrice(): Money {
    return this._unitPrice;
  }

  get quantity(): Quantity {
    return this._quantity;
  }

  get lineTotal(): Money {
    return this._lineTotal;
  }

  private generateId(): string {
    return uuidv4();
  }

  // For persistence/serialization
  toPrimitives() {
    return {
      id: this._id,
      productId: this._productId,
      productName: this._productName,
      unitPrice: this._unitPrice.value,
      quantity: this._quantity.value,
      lineTotal: this._lineTotal.value,
    };
  }

  static fromPrimitives(data: any): OrderItem {
    return new OrderItem({
      id: data.id,
      productId: data.productId,
      productName: data.productName,
      unitPrice: data.unitPrice,
      quantity: data.quantity,
    });
  }
}
