// src/modules/carts/presentation/dto/cart-item-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class CartItemResponseDto {
  @ApiProperty({
    example: 'item-123',
    description: 'Cart item ID',
  })
  id: string;

  @ApiProperty({
    example: 'prod-123',
    description: 'Product ID',
  })
  productId: string;

  @ApiProperty({
    example: 'Wireless Headphones',
    description: 'Product name',
  })
  productName: string;

  @ApiProperty({
    example: 99.99,
    description: 'Product price',
  })
  price: number;

  @ApiProperty({
    example: 2,
    description: 'Quantity',
  })
  quantity: number;

  @ApiProperty({
    example: 199.98,
    description: 'Subtotal (price * quantity)',
  })
  subtotal: number;

  @ApiProperty({
    example: 'https://example.com/image.jpg',
    description: 'Product image URL',
  })
  imageUrl: string;
}
