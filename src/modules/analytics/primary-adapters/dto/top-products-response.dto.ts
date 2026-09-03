import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TopProductItemDto {
  @ApiProperty({ type: Number, example: 1 })
  productId!: number;

  @ApiProperty({ type: String, example: 'Wireless Headphones' })
  name!: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'SKU-001' })
  sku!: string | null;

  @ApiProperty({ type: Number, example: 42 })
  unitsSold!: number;

  @ApiProperty({ type: Number, example: 1250.5 })
  lineRevenue!: number;
}

export class TopProductsResponseDto {
  @ApiProperty({ type: String, example: 'UTC' })
  timezone!: 'UTC';

  @ApiProperty({ type: String, example: '2025-10-01T00:00:00.000Z' })
  from!: string;

  @ApiProperty({ type: String, example: '2025-10-31T23:59:59.999Z' })
  to!: string;

  @ApiProperty({ type: [TopProductItemDto] })
  items!: TopProductItemDto[];
}
