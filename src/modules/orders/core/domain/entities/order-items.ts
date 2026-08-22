// src/modules/orders/domain/entities/order-item.entity.ts
import { Quantity } from '../../../../../shared-kernel/domain/value-objects/quantity';
import { Money } from '../../../../../shared-kernel/domain/value-objects/money';
import { IOrderItem } from '../interfaces/order-item.interface';

export interface OrderItemProps {
  id: number | null;
  productId: number;
  productName: string;
  sku?: string | null;
  imageUrl?: string | null;
  unitPrice: number;
  quantity: number;
}

export class OrderItem implements IOrderItem {
  private readonly _id: number | null;
  private readonly _productId: number;
  private readonly _productName: string;
  private readonly _sku: string | null;
  private readonly _imageUrl: string | null;
  private readonly _unitPrice: Money;
  private readonly _quantity: Quantity;
  private readonly _lineTotal: Money;

  constructor(props: OrderItemProps) {
    if (!props.productId) {
      throw new Error('Product ID is required');
    }
    if (!props.productName?.trim()) {
      throw new Error('Product name is required');
    }

    this._id = props.id || null;
    this._productId = props.productId;
    this._productName = props.productName.trim();
    this._sku = props.sku?.trim() || null;
    this._imageUrl = props.imageUrl?.trim() || null;
    this._unitPrice = Money.from(props.unitPrice);
    this._quantity = Quantity.from(props.quantity);
    this._lineTotal = this._unitPrice.multiply(this._quantity.value);
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

  get sku(): string | null {
    return this._sku;
  }

  get imageUrl(): string | null {
    return this._imageUrl;
  }

  get unitPrice(): number {
    return this._unitPrice.value;
  }

  get quantity(): number {
    return this._quantity.value;
  }

  get lineTotal(): number {
    return this._lineTotal.value;
  }

  // For persistence/serialization
  toPrimitives(): IOrderItem {
    return {
      id: this._id,
      productId: this._productId,
      productName: this._productName,
      sku: this._sku,
      imageUrl: this._imageUrl,
      unitPrice: this._unitPrice.value,
      quantity: this._quantity.value,
      lineTotal: this._lineTotal.value,
    };
  }

  static fromProps(data: OrderItemProps): OrderItem {
    return new OrderItem(data);
  }
}
