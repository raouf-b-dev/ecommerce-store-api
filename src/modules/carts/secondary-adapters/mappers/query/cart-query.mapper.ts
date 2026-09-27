import {
  CartItemPresentationDTO,
  CartPresentationDTO,
} from '../../../core/application/queries/results/cart-presentation.result';
import { RawCartQueryRow } from '../../dto/raw-cart-query-row.interface';

export class CartQueryMapper {
  static toPresentationDto(
    rows: RawCartQueryRow[],
  ): CartPresentationDTO | null {
    if (!rows || rows.length === 0) {
      return null;
    }

    const firstRow = rows[0];
    const items: CartItemPresentationDTO[] = [];
    let totalQuantity = 0;
    let grandTotal = 0;
    let currency: string | null = null;

    for (const row of rows) {
      if (row.itemId != null) {
        const qty = Number(row.quantity || 0);
        const unitPrice = Number(row.price || 0);
        const itemTotal = Number((qty * unitPrice).toFixed(2));
        const itemCurrency = (row.currency || 'USD').trim().toUpperCase();

        totalQuantity += qty;
        grandTotal += itemTotal;
        if (!currency) {
          currency = itemCurrency;
        }

        items.push({
          id: Number(row.itemId),
          productId: Number(row.productId || 0),
          productName: row.productName || 'Unknown Product',
          price: unitPrice,
          currency: itemCurrency,
          quantity: qty,
          subtotal: itemTotal,
          imageUrl: row.imageUrl || null,
        });
      }
    }

    // Stable shopper UX: keep add order even if the DB returns updated rows last.
    items.sort((a, b) => a.id - b.id);

    const createdAt = firstRow.cartCreatedAt
      ? firstRow.cartCreatedAt instanceof Date
        ? firstRow.cartCreatedAt.toISOString()
        : String(firstRow.cartCreatedAt)
      : firstRow.cartUpdatedAt instanceof Date
        ? firstRow.cartUpdatedAt.toISOString()
        : String(firstRow.cartUpdatedAt);

    const subtotal = Number(grandTotal.toFixed(2));
    const shippingCost = 0;

    return {
      id: Number(firstRow.cartId),
      userId: Number(firstRow.userId),
      items,
      itemCount: totalQuantity,
      subtotal,
      shippingCost,
      totalAmount: Number((subtotal + shippingCost).toFixed(2)),
      currency,
      createdAt,
      updatedAt:
        firstRow.cartUpdatedAt instanceof Date
          ? firstRow.cartUpdatedAt.toISOString()
          : String(firstRow.cartUpdatedAt),
    };
  }
}
