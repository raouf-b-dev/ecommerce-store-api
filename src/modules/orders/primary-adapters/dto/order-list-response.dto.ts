import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '../../core/domain/value-objects/order-status';

/** List read model (joined with customer name/email). */
export class OrderListItemResponseDto {
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

  @ApiProperty({ example: 2, description: 'Number of line items' })
  itemCount!: number;

  @ApiProperty({ example: 224.94, description: 'Order total amount' })
  totalAmount!: number;

  @ApiProperty({ example: 'USD', description: 'Currency code' })
  currency!: string;

  @ApiProperty({
    example: '2025-10-31T12:30:00.000Z',
    description: 'Order creation date',
  })
  createdAt!: string;
}

/** Paginated list envelope. */
export class PaginatedOrdersResponseDto {
  @ApiProperty({ type: [OrderListItemResponseDto] })
  items!: OrderListItemResponseDto[];

  @ApiProperty({ example: 4 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  limit!: number;

  @ApiProperty({ example: 1 })
  totalPages!: number;
}
