import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '../../core/domain/value-objects/order-status';

export class OrderItemDetailResponseDto {
  @ApiProperty({ example: 1, description: 'Product ID' })
  productId!: number;

  @ApiProperty({ example: 'ELEC-ANC-001', description: 'Product SKU' })
  sku!: string;

  @ApiProperty({
    example: 'Wireless Noise-Canceling Headphones',
    description: 'Product title',
  })
  title!: string;

  @ApiProperty({ example: 199.99, description: 'Unit price' })
  unitPrice!: number;

  @ApiProperty({ example: 1, description: 'Quantity ordered' })
  quantity!: number;

  @ApiProperty({ example: 199.99, description: 'Line subtotal' })
  subtotal!: number;
}

/** Detail read model for GET /orders/:id. */
export class OrderDetailResponseDto {
  @ApiProperty({ example: 1, description: 'Order ID' })
  id!: number;

  @ApiProperty({
    example: 'ORD-2025-0001',
    description: 'Human-readable order number',
  })
  orderNumber!: string;

  @ApiProperty({ example: 3, description: 'Customer user ID' })
  userId!: number;

  @ApiProperty({ example: 'Jane Doe', description: 'Customer display name' })
  userName!: string;

  @ApiProperty({
    example: 'customer@store.local',
    description: 'Customer email',
  })
  userEmail!: string;

  @ApiProperty({
    enum: OrderStatus,
    example: OrderStatus.CONFIRMED,
    description: 'Order status',
  })
  status!: OrderStatus;

  @ApiProperty({
    example: 'Jane Doe, 123 Tech Boulevard, San Francisco, CA 94105, US',
    description: 'Formatted shipping address',
  })
  shippingAddress!: string;

  @ApiProperty({ type: [OrderItemDetailResponseDto] })
  items!: OrderItemDetailResponseDto[];

  @ApiProperty({ example: 224.94, description: 'Order total amount' })
  totalAmount!: number;

  @ApiProperty({ example: 224.94, description: 'Order total price' })
  totalPrice!: number;

  @ApiProperty({ example: 'USD', description: 'Currency code' })
  currency!: string;

  @ApiProperty({
    example: '2025-10-31T12:30:00.000Z',
    description: 'Order creation date',
  })
  createdAt!: string;

  @ApiProperty({
    example: '2025-10-31T12:35:00.000Z',
    description: 'Last update date',
  })
  updatedAt!: string;
}

/**
 * Slim mutation response after status transitions.
 * Admin SPA invalidates and refetches the detail read model.
 */
export class OrderMutationResponseDto {
  @ApiProperty({ example: 1, description: 'Order ID' })
  id!: number;

  @ApiProperty({
    enum: OrderStatus,
    example: OrderStatus.PROCESSING,
    description: 'Updated order status',
  })
  status!: OrderStatus;

  @ApiProperty({ example: 224.94, description: 'Order total price' })
  totalPrice!: number;

  @ApiProperty({ example: 'USD', description: 'Currency code' })
  currency!: string;

  @ApiProperty({
    example: '2025-10-31T12:35:00.000Z',
    description: 'Last update date',
  })
  updatedAt!: string;
}
