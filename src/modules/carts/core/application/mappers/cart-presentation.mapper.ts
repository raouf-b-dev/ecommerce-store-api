import { Cart } from '../../domain/entities/cart';
import {
  CartItemPresentationDTO,
  CartPresentationDTO,
} from '../queries/results/cart-presentation.result';
import { decimalFromMinorUnits } from '../../../../../shared-kernel/domain/value-objects/money-decimal';
import { Currency } from '../../../../../shared-kernel/domain/value-objects/currency';

export class CartPresentationMapper {
  static fromDomain(cart: Cart): CartPresentationDTO {
    const cartExponent = cart.currency
      ? Currency.getExponent(cart.currency)
      : 2;
    const subtotal = Number(
      decimalFromMinorUnits(cart.totalAmount, cartExponent),
    );
    const shippingCost = 0;
    const items: CartItemPresentationDTO[] = cart.items.map((item) => {
      const itemExponent = Currency.getExponent(item.currency);
      return {
        id: item.id!,
        productId: item.productId,
        productName: item.productName,
        price: Number(decimalFromMinorUnits(item.price, itemExponent)),
        currency: item.currency,
        quantity: item.quantity,
        subtotal: Number(decimalFromMinorUnits(item.subtotal, itemExponent)),
        imageUrl: item.imageUrl,
      };
    });

    return {
      id: cart.id!,
      userId: cart.userId,
      items,
      itemCount: cart.itemCount,
      subtotal,
      shippingCost,
      totalAmount: Number((subtotal + shippingCost).toFixed(cartExponent)),
      currency: cart.currency,
      createdAt: cart.createdAt.toISOString(),
      updatedAt: cart.updatedAt.toISOString(),
    };
  }
}
