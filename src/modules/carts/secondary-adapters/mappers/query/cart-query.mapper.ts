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

    for (const row of rows) {
      if (row.itemId) {
        const qty = Number(row.quantity || 0);
        const unitPrice = Number(row.price || 0);
        const itemTotal = Number((qty * unitPrice).toFixed(2));

        totalQuantity += qty;
        grandTotal += itemTotal;

        items.push({
          id: Number(row.itemId),
          productId: Number(row.productId || 0),
          productName: row.productName || 'Unknown Product',
          price: unitPrice,
          quantity: qty,
          itemTotal,
          imageUrl: row.imageUrl || null,
        });
      }
    }

    return {
      id: Number(firstRow.cartId),
      userId: Number(firstRow.userId),
      items,
      totalQuantity,
      grandTotal: Number(grandTotal.toFixed(2)),
      updatedAt:
        firstRow.cartUpdatedAt instanceof Date
          ? firstRow.cartUpdatedAt.toISOString()
          : String(firstRow.cartUpdatedAt),
    };
  }
}
