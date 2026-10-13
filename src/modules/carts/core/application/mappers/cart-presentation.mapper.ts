import { Cart } from '../../domain/entities/cart';
import {
  CartItemPresentationDTO,
  CartPresentationDTO,
} from '../queries/results/cart-presentation.result';
import { Money } from '../../../../../shared-kernel/domain/value-objects/money';

export class CartPresentationMapper {
  static fromDomain(cart: Cart): CartPresentationDTO {
    if (!cart.currency || cart.items.length === 0) {
      return {
        id: cart.id ?? 0,
        userId: cart.userId,
        items: [],
        itemCount: 0,
        subtotal: 0,
        shippingCost: 0,
        totalAmount: 0,
        currency: cart.currency,
        createdAt: cart.createdAt.toISOString(),
        updatedAt: cart.updatedAt.toISOString(),
      };
    }

    const lineMoneys: Money[] = [];
    const items: CartItemPresentationDTO[] = cart.items.map((item) => {
      const itemMoneyResult = Money.create(item.price, item.currency);
      const lineMoneyResult = itemMoneyResult.isSuccess
        ? itemMoneyResult.value.multiply(item.quantity)
        : Money.create(item.subtotal, item.currency);

      if (lineMoneyResult.isSuccess) {
        lineMoneys.push(lineMoneyResult.value);
      }

      return {
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        price: itemMoneyResult.isSuccess
          ? itemMoneyResult.value.toMajorUnits()
          : 0,
        currency: item.currency,
        quantity: item.quantity,
        subtotal: lineMoneyResult.isSuccess
          ? lineMoneyResult.value.toMajorUnits()
          : 0,
        imageUrl: item.imageUrl,
      };
    });

    const sumResult =
      lineMoneys.length > 0
        ? Money.sum(lineMoneys)
        : Money.create(0, cart.currency);
    const subtotal = sumResult.isSuccess ? sumResult.value.toMajorUnits() : 0;
    const shippingCost = 0;
    const totalAmount = subtotal;

    return {
      id: cart.id ?? 0,
      userId: cart.userId,
      items,
      itemCount: cart.itemCount,
      subtotal,
      shippingCost,
      totalAmount,
      currency: cart.currency,
      createdAt: cart.createdAt.toISOString(),
      updatedAt: cart.updatedAt.toISOString(),
    };
  }
}
