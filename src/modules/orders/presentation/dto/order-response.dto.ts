import { ApiProperty } from '@nestjs/swagger';
import { OrderItemResponseDto } from './order-item-response.dto';

export class OrderResponseDto {
  @ApiProperty({ example: 'ord_123' })
  id: string;

  @ApiProperty({ example: 'cust_456' })
  customerId: string;

  @ApiProperty({ type: [OrderItemResponseDto] })
  items: OrderItemResponseDto[];

  @ApiProperty({ enum: ['pending', 'paid', 'shipped', 'cancelled'] })
  status: 'pending' | 'paid' | 'shipped' | 'cancelled';

  @ApiProperty({ example: 2400 })
  totalPrice: number;

  @ApiProperty({ example: '2025-08-25T12:34:56.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-08-25T12:34:56.000Z' })
  updatedAt: Date;
}
