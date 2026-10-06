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
    example: 9999,
    description: 'Unit price in minor currency units, snapshotted at add time',
    type: 'integer',
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
    example: 19998,
    description: 'Line subtotal in minor currency units',
    type: 'integer',
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
