import {
  CartItemPresentationDTO,
  CartPresentationDTO,
} from '../../../core/application/queries/results/cart-presentation.result';
import { cartTotalsFromSubtotal } from '../../../core/application/mappers/cart-totals.helper';
import { RawCartQueryRow } from '../../dto/raw-cart-query-row.interface';
import { Currency } from '../../../../../shared-kernel/domain/value-objects/currency';
import { Money } from '../../../../../shared-kernel/domain/value-objects/money';

export class CartQueryMapper {
  static toPresentationDto(
    rows: RawCartQueryRow[],
  ): CartPresentationDTO | null {
    if (!rows || rows.length === 0) {
      return null;
    }

    const firstRow = rows[0];
    const items: CartItemPresentationDTO[] = [];
    const itemMoneys: Money[] = [];
    let totalQuantity = 0;
    let currency: string | null = null;

    for (const row of rows) {
      if (row.itemId == null) {
        continue;
      }

      if (row.productId == null) {
        throw new Error(
          `Cart line ${row.itemId} is missing productId (cart ${row.cartId})`,
        );
      }
      const productName = row.productName?.trim();
      if (!productName) {
        throw new Error(
          `Cart line ${row.itemId} is missing productName (cart ${row.cartId})`,
        );
      }
      if (row.price == null || !Number.isFinite(Number(row.price))) {
        throw new Error(
          `Cart line ${row.itemId} is missing a valid price (cart ${row.cartId})`,
        );
      }
      if (row.quantity == null || !Number.isFinite(Number(row.quantity))) {
        throw new Error(
          `Cart line ${row.itemId} is missing a valid quantity (cart ${row.cartId})`,
        );
      }

      const qty = Number(row.quantity);
      const unitPrice = Number(row.price);
      const rawCurrency = (row.currency ?? '').trim().toUpperCase();
      const currencyResult = Currency.create(rawCurrency);
      if (currencyResult.isFailure) {
        throw currencyResult.error;
      }
      const curr = currencyResult.value;
      const itemMoneyResult = Money.fromDecimal(unitPrice, curr);
      if (itemMoneyResult.isFailure) {
        throw itemMoneyResult.error;
      }
      const lineMoneyResult = itemMoneyResult.value.multiply(qty);
      if (lineMoneyResult.isFailure) {
        throw lineMoneyResult.error;
      }

      totalQuantity += qty;
      itemMoneys.push(lineMoneyResult.value);
      if (!currency) {
        currency = curr.code;
      }

      items.push({
        id: Number(row.itemId),
        productId: Number(row.productId),
        productName,
        price: itemMoneyResult.value.toMajorUnits(),
        currency: curr.code,
        quantity: qty,
        subtotal: lineMoneyResult.value.toMajorUnits(),
        imageUrl: row.imageUrl || null,
      });
    }

    // Stable shopper UX: keep add order even if the DB returns updated rows last.
    items.sort((a, b) => (a.id ?? 0) - (b.id ?? 0));

    const createdAt = firstRow.cartCreatedAt
      ? firstRow.cartCreatedAt instanceof Date
        ? firstRow.cartCreatedAt.toISOString()
        : String(firstRow.cartCreatedAt)
      : firstRow.cartUpdatedAt instanceof Date
        ? firstRow.cartUpdatedAt.toISOString()
        : String(firstRow.cartUpdatedAt);

    let subtotal = 0;

    if (itemMoneys.length > 0) {
      const sumResult = Money.sum(itemMoneys);
      if (sumResult.isFailure) {
        throw sumResult.error;
      }
      subtotal = sumResult.value.toMajorUnits();
    } else {
      currency = null;
    }

    const { shippingCost, totalAmount } = cartTotalsFromSubtotal(subtotal);

    return {
      id: Number(firstRow.cartId),
      userId: Number(firstRow.userId),
      items,
      itemCount: totalQuantity,
      subtotal,
      shippingCost,
      totalAmount,
      currency,
      createdAt,
      updatedAt:
        firstRow.cartUpdatedAt instanceof Date
          ? firstRow.cartUpdatedAt.toISOString()
          : String(firstRow.cartUpdatedAt),
    };
  }
}
