// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

// src/modules/orders/domain/value-objects/order-pricing.ts
import { Money } from '../../../../../shared-kernel/domain/value-objects/money';
import { OrderItem } from '../entities/order-items';

export interface OrderPricingProps {
  subtotal: Money;
  shippingCost: Money;
  totalPrice: Money;
}

export class OrderPricing {
  private readonly _subtotal: Money;
  private readonly _shippingCost: Money;
  private readonly _totalPrice: Money;

  private constructor(props: OrderPricingProps) {
    this._subtotal = props.subtotal;
    this._shippingCost = props.shippingCost;
    this._totalPrice = props.totalPrice;
  }

  get subtotal(): number {
    return this._subtotal.value;
  }

  get shippingCost(): number {
    return this._shippingCost.value;
  }

  get totalPrice(): number {
    return this._totalPrice.value;
  }

  getSubtotalMoney(): Money {
    return this._subtotal;
  }

  getShippingCostMoney(): Money {
    return this._shippingCost;
  }

  getTotalPriceMoney(): Money {
    return this._totalPrice;
  }

  static calculate(items: OrderItem[]): OrderPricing {
    const lineTotals = items.map((item) => item.getLineTotalMoney());
    const subtotalResult = Money.sum(lineTotals);
    if (subtotalResult.isFailure) {
      throw subtotalResult.error;
    }

    const subtotal = subtotalResult.value;
    const shippingCost = Money.zero(subtotal.currency);
    const totalPriceResult = subtotal.add(shippingCost);
    if (totalPriceResult.isFailure) {
      throw totalPriceResult.error;
    }

    return new OrderPricing({
      subtotal,
      shippingCost,
      totalPrice: totalPriceResult.value,
    });
  }

  static recalculate(items: OrderItem[]): OrderPricing {
    return OrderPricing.calculate(items);
  }

  toPrimitives(): {
    subtotal: number;
    shippingCost: number;
    totalPrice: number;
  } {
    return {
      subtotal: this.subtotal,
      shippingCost: this.shippingCost,
      totalPrice: this.totalPrice,
    };
  }

  equals(other: OrderPricing): boolean {
    return (
      this._subtotal.equals(other._subtotal) &&
      this._shippingCost.equals(other._shippingCost) &&
      this._totalPrice.equals(other._totalPrice)
    );
  }
}
