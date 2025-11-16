// src/modules/carts/domain/value-objects/cart-total.ts
import { Result } from '../../../../core/domain/result';
import { DomainError } from '../../../../core/errors/domain.error';
import { ErrorFactory } from '../../../../core/errors/error.factory';

export class CartTotal {
  private readonly _subtotal: number;
  private readonly _tax: number;
  private readonly _shipping: number;
  private readonly _discount: number;

  constructor(
    subtotal: number,
    tax: number = 0,
    shipping: number = 0,
    discount: number = 0,
  ) {
    const validationResult = this.validateProps({
      subtotal,
      tax,
      shipping,
      discount,
    });
    if (validationResult.isFailure) throw validationResult.error;

    this._subtotal = this.roundPrice(subtotal);
    this._tax = this.roundPrice(tax);
    this._shipping = this.roundPrice(shipping);
    this._discount = this.roundPrice(discount);
  }
  private validateProps(props: {
    subtotal: number;
    tax: number;
    shipping: number;
    discount: number;
  }): Result<void, DomainError> {
    if (props.subtotal < 0) {
      return ErrorFactory.DomainError('Subtotal cannot be negative');
    }
    if (props.tax < 0) {
      return ErrorFactory.DomainError('Tax cannot be negative');
    }
    if (props.shipping < 0) {
      return ErrorFactory.DomainError('Shipping cannot be negative');
    }
    if (props.discount < 0) {
      return ErrorFactory.DomainError('Discount cannot be negative');
    }

    return Result.success(undefined);
  }

  private roundPrice(price: number): number {
    return Math.round(price * 100) / 100;
  }

  get subtotal(): number {
    return this._subtotal;
  }

  get tax(): number {
    return this._tax;
  }

  get shipping(): number {
    return this._shipping;
  }

  get discount(): number {
    return this._discount;
  }

  get total(): number {
    return this.roundPrice(
      this._subtotal + this._tax + this._shipping - this._discount,
    );
  }

  withTax(tax: number): CartTotal {
    return new CartTotal(this._subtotal, tax, this._shipping, this._discount);
  }

  withShipping(shipping: number): CartTotal {
    return new CartTotal(this._subtotal, this._tax, shipping, this._discount);
  }

  withDiscount(discount: number): CartTotal {
    return new CartTotal(this._subtotal, this._tax, this._shipping, discount);
  }

  static fromSubtotal(subtotal: number): CartTotal {
    return new CartTotal(subtotal);
  }
}
