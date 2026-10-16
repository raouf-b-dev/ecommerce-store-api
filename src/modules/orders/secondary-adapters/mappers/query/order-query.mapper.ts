import { OrderEntity } from '../../orm/order.schema';
import { OrderItemEntity } from '../../orm/order-item.schema';
import { OrderListItemDTO } from '../../../core/application/queries/results/order-list-item.result';
import { OrderDetailDTO } from '../../../core/application/queries/results/order-detail.result';
import { OrderItemDetailDTO } from '../../../core/application/queries/results/order-item-detail.result';
import { RawOrderListQueryRow } from '../../dto/raw-order-list-query-row.interface';

function requireFiniteNumber(value: unknown, field: string): number {
  if (value === null || value === undefined || value === '') {
    throw new Error(`Order query row is missing a valid ${field}`);
  }
  const n = Number(value);
  if (!Number.isFinite(n)) {
    throw new Error(`Order query row is missing a valid ${field}`);
  }
  return n;
}

function optionalTrimmedString(
  value: string | null | undefined,
): string | null {
  if (value == null) {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export class OrderQueryMapper {
  /**
   * Maps a raw SQL projection row to a clean presentation OrderListItemDTO.
   */
  static toListItemDto(row: RawOrderListQueryRow): OrderListItemDTO {
    const status = optionalTrimmedString(row.status);
    if (!status) {
      throw new Error(`Order ${row.id} is missing status`);
    }
    const currency = optionalTrimmedString(row.currency);
    if (!currency) {
      throw new Error(`Order ${row.id} is missing currency`);
    }

    return {
      id: requireFiniteNumber(row.id, 'id'),
      orderNumber: `ORD-${row.id}`,
      userId: requireFiniteNumber(row.userId, 'userId'),
      userName: optionalTrimmedString(row.userName),
      userEmail: optionalTrimmedString(row.userEmail),
      status,
      itemCount: requireFiniteNumber(row.itemCount, 'itemCount'),
      totalAmount: requireFiniteNumber(row.totalAmount, 'totalAmount'),
      currency,
      createdAt: new Date(row.createdAt),
    };
  }

  /**
   * Maps a single OrderItemEntity from its purchase snapshot to OrderItemDetailDTO.
   */
  static toItemDetailDto(item: OrderItemEntity): OrderItemDetailDTO {
    const title = optionalTrimmedString(item.productName);
    if (!title) {
      throw new Error(
        `Order item for product ${item.productId} is missing a title`,
      );
    }
    const sku = optionalTrimmedString(item.sku);

    return {
      productId: item.productId,
      sku,
      title,
      unitPrice: requireFiniteNumber(item.unitPrice, 'unitPrice'),
      quantity: requireFiniteNumber(item.quantity, 'quantity'),
      subtotal: requireFiniteNumber(item.lineTotal, 'lineTotal'),
      imageUrl: item.imageUrl ?? null,
    };
  }

  /**
   * Maps an OrderEntity aggregate and user details into OrderDetailDTO.
   */
  static toDetailDto(
    orderEntity: OrderEntity,
    user?: { firstName: string; lastName: string; email: string } | null,
  ): OrderDetailDTO {
    const items: OrderItemDetailDTO[] = (orderEntity.items || []).map((item) =>
      this.toItemDetailDto(item),
    );

    const shippingAddrStr = orderEntity.shippingAddress
      ? `${orderEntity.shippingAddress.street}, ${orderEntity.shippingAddress.city}, ${orderEntity.shippingAddress.state} ${orderEntity.shippingAddress.postalCode}`
      : null;

    const userName = user
      ? optionalTrimmedString(`${user.firstName} ${user.lastName}`)
      : null;
    const userEmail = user ? optionalTrimmedString(user.email) : null;

    return {
      id: orderEntity.id,
      orderNumber: `ORD-${orderEntity.id}`,
      userId: orderEntity.userId,
      userName,
      userEmail,
      status: orderEntity.status,
      paymentMethod: orderEntity.paymentMethod,
      shippingAddress: shippingAddrStr,
      items,
      subtotal: requireFiniteNumber(orderEntity.subtotal, 'subtotal'),
      shippingCost: requireFiniteNumber(
        orderEntity.shippingCost,
        'shippingCost',
      ),
      totalAmount: requireFiniteNumber(orderEntity.totalPrice, 'totalPrice'),
      totalPrice: requireFiniteNumber(orderEntity.totalPrice, 'totalPrice'),
      currency: orderEntity.currency,
      createdAt: orderEntity.createdAt,
      updatedAt: orderEntity.updatedAt,
    };
  }
}
