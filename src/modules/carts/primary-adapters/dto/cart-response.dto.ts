import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CartItemResponseDto } from './cart-item-response.dto';

export class CartResponseDto {
  @ApiProperty({
    example: 1,
    description: 'Cart ID',
    type: Number,
  })
  id!: number;

  @ApiPropertyOptional({
    example: 123,
    description: 'User ID',
    type: Number,
  })
  userId?: number;

  @ApiProperty({
    type: [CartItemResponseDto],
    description: 'Cart items',
  })
  @Type(() => CartItemResponseDto)
  items!: CartItemResponseDto[];

  @ApiProperty({
    example: 3,
    description: 'Total number of items',
    type: Number,
  })
  itemCount!: number;

  @ApiProperty({
    example: 29997,
    description: 'Cart subtotal in minor currency units (sum of line items)',
    type: 'integer',
  })
  subtotal!: number;

  @ApiProperty({
    example: 0,
    description:
      'Shipping cost in minor currency units. MVP policy: always 0 until a shipping engine ships.',
    type: 'integer',
  })
  shippingCost!: number;

  @ApiProperty({
    example: 29997,
    description: 'Cart total in minor currency units (subtotal + shippingCost)',
    type: 'integer',
  })
  totalAmount!: number;

  @ApiProperty({
    example: 'USD',
    description:
      'ISO 4217 currency for cart totals. Null when the cart has no items.',
    type: String,
    nullable: true,
  })
  currency!: string | null;

  @ApiProperty({
    example: '2025-10-31T10:00:00.000Z',
    description: 'Cart creation date (ISO 8601)',
    type: String,
  })
  createdAt!: string;

  @ApiProperty({
    example: '2025-10-31T12:30:00.000Z',
    description: 'Last update date (ISO 8601)',
    type: String,
  })
  updatedAt!: string;
}
