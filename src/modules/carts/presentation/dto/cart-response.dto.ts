// src/modules/carts/presentation/dto/cart-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { CartItemResponseDto } from './cart-item-response.dto';

export class CartResponseDto {
  @ApiProperty({
    example: 'cart-123',
    description: 'Cart ID',
  })
  id: string;

  @ApiPropertyOptional({
    example: 'user-123',
    description: 'Customer ID',
  })
  customerId?: string;

  @ApiPropertyOptional({
    example: 'session-abc-xyz',
    description: 'Session ID',
  })
  sessionId?: string;

  @ApiProperty({
    type: [CartItemResponseDto],
    description: 'Cart items',
  })
  @Type(() => CartItemResponseDto)
  items: CartItemResponseDto[];

  @ApiProperty({
    example: 3,
    description: 'Total number of items',
  })
  itemCount: number;

  @ApiProperty({
    example: 299.97,
    description: 'Cart total amount',
  })
  totalAmount: number;

  @ApiProperty({
    example: '2025-10-31T10:00:00Z',
    description: 'Cart creation date',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2025-10-31T12:30:00Z',
    description: 'Last update date',
  })
  updatedAt: Date;
}
