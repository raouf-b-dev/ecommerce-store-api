import { Cart } from '../../domain/entities/cart';
import {
  CartItemPresentationDTO,
  CartPresentationDTO,
} from '../queries/results/cart-presentation.result';

export class CartPresentationMapper {
  static fromDomain(cart: Cart): CartPresentationDTO {
    const subtotal = cart.totalAmount;
    const shippingCost = 0;
    const items: CartItemPresentationDTO[] = cart.items.map((item) => ({
      id: item.id!,
      productId: item.productId,
      productName: item.productName,
      price: item.price,
      currency: item.currency,
      quantity: item.quantity,
      subtotal: item.subtotal,
      imageUrl: item.imageUrl,
    }));

    return {
      id: cart.id!,
      userId: cart.userId,
      items,
      itemCount: cart.itemCount,
      subtotal,
      shippingCost,
      totalAmount: Number((subtotal + shippingCost).toFixed(2)),
      currency: cart.currency,
      createdAt: cart.createdAt.toISOString(),
      updatedAt: cart.updatedAt.toISOString(),
    };
  }
}
