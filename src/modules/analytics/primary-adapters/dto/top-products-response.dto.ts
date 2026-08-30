import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class TopProductItemDto {
  @ApiProperty()
  productId!: number;

  @ApiProperty()
  name!: string;

  @ApiPropertyOptional({ nullable: true })
  sku!: string | null;

  @ApiProperty()
  unitsSold!: number;

  @ApiProperty()
  lineRevenue!: number;
}

export class TopProductsResponseDto {
  @ApiProperty({ example: 'UTC' })
  timezone!: 'UTC';

  @ApiProperty()
  from!: string;

  @ApiProperty()
  to!: string;

  @ApiProperty({ type: [TopProductItemDto] })
  items!: TopProductItemDto[];
}
