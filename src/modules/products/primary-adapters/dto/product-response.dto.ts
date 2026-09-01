import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Create / update response (entity primitives). */
export class ProductResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Laptop' })
  name!: string;

  @ApiProperty({ example: 'laptop' })
  slug!: string;

  @ApiPropertyOptional({ example: 'High-end gaming laptop' })
  description?: string;

  @ApiProperty({ example: 1200 })
  price!: number;

  @ApiProperty({ example: 'USD' })
  currency!: string;

  @ApiPropertyOptional({ example: 'SKU12345' })
  sku?: string;

  @ApiPropertyOptional({
    example: 'https://example.com/laptop.jpg',
    nullable: true,
    type: String,
  })
  imageUrl?: string | null;

  @ApiPropertyOptional({ example: 1, nullable: true, type: Number })
  categoryId?: number | null;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: '2025-08-25T12:34:56.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2025-08-25T12:34:56.000Z' })
  updatedAt!: Date;
}

/** List item read model. */
export class ProductListItemResponseDto {
  @ApiProperty({ example: 1 })
  id!: number;

  @ApiProperty({ example: 'Laptop' })
  name!: string;

  @ApiProperty({ example: 'laptop' })
  slug!: string;

  @ApiProperty({ example: 'SKU12345' })
  sku!: string;

  @ApiProperty({ example: 1200 })
  price!: number;

  @ApiProperty({ example: 'USD' })
  currency!: string;

  @ApiPropertyOptional({
    example: 'https://example.com/laptop.jpg',
    nullable: true,
    type: String,
  })
  imageUrl!: string | null;

  @ApiPropertyOptional({ example: 1, nullable: true, type: Number })
  categoryId!: number | null;

  @ApiProperty({ example: true })
  isActive!: boolean;

  @ApiProperty({ example: '2025-08-25T12:34:56.000Z' })
  createdAt!: string;
}

/** Detail read model. */
export class ProductDetailResponseDto extends ProductListItemResponseDto {
  @ApiPropertyOptional({
    example: 'High-end gaming laptop',
    nullable: true,
    type: String,
  })
  description!: string | null;

  @ApiProperty({ example: '2025-08-25T12:34:56.000Z' })
  updatedAt!: string;
}

/** Paginated list envelope. */
export class PaginatedProductsResponseDto {
  @ApiProperty({ type: [ProductListItemResponseDto] })
  items!: ProductListItemResponseDto[];

  @ApiProperty({ example: 15 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  limit!: number;

  @ApiProperty({ example: 2 })
  totalPages!: number;
}
