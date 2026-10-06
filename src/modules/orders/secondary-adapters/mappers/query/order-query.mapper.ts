import { OrderEntity } from '../../orm/order.schema';
import { OrderItemEntity } from '../../orm/order-item.schema';
import { OrderListItemDTO } from '../../../core/application/queries/results/order-list-item.result';
import { OrderDetailDTO } from '../../../core/application/queries/results/order-detail.result';
import { OrderItemDetailDTO } from '../../../core/application/queries/results/order-item-detail.result';
import { RawOrderListQueryRow } from '../../dto/raw-order-list-query-row.interface';
import { requireMinorUnits } from '../../../../../shared-kernel/domain/value-objects/money-decimal';

export class OrderQueryMapper {
  /**
   * Maps a raw SQL projection row to a clean presentation OrderListItemDTO.
   */
  static toListItemDto(row: RawOrderListQueryRow): OrderListItemDTO {
    return {
      id: Number(row.id),
      orderNumber: `ORD-${row.id}`,
      userId: Number(row.userId),
      userName: row.userName || 'Unknown User',
      userEmail: row.userEmail || '',
      status: String(row.status || ''),
      itemCount: Number(row.itemCount || 0),
      totalAmount: requireMinorUnits(row.totalAmount || 0),
      currency: 'USD',
      createdAt: new Date(row.createdAt),
    };
  }

  /**
   * Maps a single OrderItemEntity and optional product information to OrderItemDetailDTO.
   */
  static toItemDetailDto(
    item: OrderItemEntity,
    productInfo?: { sku: string; title: string },
  ): OrderItemDetailDTO {
    return {
      productId: item.productId,
      sku: item.sku || productInfo?.sku || `SKU-${item.productId}`,
      title:
        item.productName || productInfo?.title || `Product #${item.productId}`,
      unitPrice: requireMinorUnits(item.unitPrice),
      quantity: item.quantity,
      subtotal: requireMinorUnits(item.lineTotal),
      imageUrl: item.imageUrl ?? null,
    };
  }

  /**
   * Maps an OrderEntity aggregate, user details, and product map into OrderDetailDTO.
   */
  static toDetailDto(
    orderEntity: OrderEntity,
    user?: { firstName: string; lastName: string; email: string } | null,
    productMap?: Map<number, { sku: string; title: string }>,
  ): OrderDetailDTO {
    const items: OrderItemDetailDTO[] = (orderEntity.items || []).map((item) =>
      this.toItemDetailDto(item, productMap?.get(item.productId)),
    );

    const shippingAddrStr = orderEntity.shippingAddress
      ? `${orderEntity.shippingAddress.street}, ${orderEntity.shippingAddress.city}, ${orderEntity.shippingAddress.state} ${orderEntity.shippingAddress.postalCode}`
      : 'N/A';

    const userName = user ? `${user.firstName} ${user.lastName}` : 'Customer';
    const userEmail = user ? user.email : '';

    return {
      id: orderEntity.id,
      orderNumber: `ORD-${orderEntity.id}`,
      userId: orderEntity.userId,
      userName,
      userEmail,
      status: orderEntity.status,
      shippingAddress: shippingAddrStr,
      items,
      subtotal: requireMinorUnits(orderEntity.subtotal),
      shippingCost: requireMinorUnits(orderEntity.shippingCost),
      totalAmount: requireMinorUnits(orderEntity.totalPrice),
      totalPrice: requireMinorUnits(orderEntity.totalPrice),
      currency: 'USD',
      createdAt: orderEntity.createdAt,
      updatedAt: orderEntity.updatedAt,
    };
  }
}
