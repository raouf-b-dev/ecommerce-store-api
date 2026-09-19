import { ApiProperty } from '@nestjs/swagger';

export class CartItemResponseDto {
  @ApiProperty({
    example: 10,
    description: 'Cart item ID',
    type: Number,
  })
  id!: number;

  @ApiProperty({
    example: 5,
    description: 'Product ID',
    type: Number,
  })
  productId!: number;

  @ApiProperty({
    example: 'Wireless Headphones',
    description: 'Product name',
  })
  productName!: string;

  @ApiProperty({
    example: 99.99,
    description: 'Unit price snapshotted at add time',
    type: Number,
  })
  price!: number;

  @ApiProperty({
    example: 'USD',
    description: 'ISO 4217 currency snapshotted from the product at add time',
  })
  currency!: string;

  @ApiProperty({
    example: 2,
    description: 'Quantity',
    type: Number,
  })
  quantity!: number;

  @ApiProperty({
    example: 199.98,
    description: 'Subtotal (price * quantity)',
    type: Number,
  })
  subtotal!: number;

  @ApiProperty({
    example: 'https://example.com/image.jpg',
    description: 'Product image URL',
    type: String,
    nullable: true,
  })
  imageUrl!: string | null;
}
