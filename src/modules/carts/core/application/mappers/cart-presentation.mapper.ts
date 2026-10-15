import { Cart } from '../../domain/entities/cart';
import {
  CartItemPresentationDTO,
  CartPresentationDTO,
} from '../queries/results/cart-presentation.result';
import { Result } from '../../../../../shared-kernel/domain/result';
import { DomainError } from '../../../../../shared-kernel/domain/exceptions/domain.error';
import { Money } from '../../../../../shared-kernel/domain/value-objects/money';

export class CartPresentationMapper {
  static fromDomain(cart: Cart): Result<CartPresentationDTO, DomainError> {
    if (!cart.currency || cart.items.length === 0) {
      return Result.success({
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
      });
    }

    const lineMoneys: Money[] = [];
    const items: CartItemPresentationDTO[] = [];

    for (const item of cart.items) {
      const itemMoneyResult = Money.create(item.price, item.currency);
      if (itemMoneyResult.isFailure) {
        return itemMoneyResult;
      }
      const lineMoneyResult = itemMoneyResult.value.multiply(item.quantity);
      if (lineMoneyResult.isFailure) {
        return lineMoneyResult;
      }

      lineMoneys.push(lineMoneyResult.value);
      items.push({
        id: item.id,
        productId: item.productId,
        productName: item.productName,
        price: itemMoneyResult.value.toMajorUnits(),
        currency: item.currency,
        quantity: item.quantity,
        subtotal: lineMoneyResult.value.toMajorUnits(),
        imageUrl: item.imageUrl,
      });
    }

    const sumResult = Money.sum(lineMoneys);
    if (sumResult.isFailure) {
      return sumResult;
    }

    const subtotal = sumResult.value.toMajorUnits();
    const shippingCost = 0;

    return Result.success({
      id: cart.id ?? 0,
      userId: cart.userId,
      items,
      itemCount: cart.itemCount,
      subtotal,
      shippingCost,
      totalAmount: subtotal,
      currency: cart.currency,
      createdAt: cart.createdAt.toISOString(),
      updatedAt: cart.updatedAt.toISOString(),
    });
  }
}
