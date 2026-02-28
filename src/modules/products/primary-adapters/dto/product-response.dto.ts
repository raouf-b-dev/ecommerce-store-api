import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProductResponseDto {
  @ApiProperty({ example: 'prod_123' })
  id: string;

  @ApiProperty({ example: 'Laptop' })
  name: string;

  @ApiPropertyOptional({ example: 'High-end gaming laptop' })
  description?: string;

  @ApiPropertyOptional({ example: 'SKU12345' })
  sku?: string;

  @ApiProperty({ example: 1200 })
  price: number;

  @ApiProperty({ example: 50 })
  stockQuantity: number;

  @ApiProperty({ example: '2025-08-25T12:34:56.000Z' })
  createdAt: Date;

  @ApiProperty({ example: '2025-08-25T12:34:56.000Z' })
  updatedAt: Date;
}
