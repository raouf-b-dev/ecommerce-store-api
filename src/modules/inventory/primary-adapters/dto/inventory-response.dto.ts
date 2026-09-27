import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** List / get-by-product read model (joined with product SKU + title). */
export class InventoryListItemResponseDto {
  @ApiProperty({ example: 1, description: 'Inventory record ID' })
  id!: number;

  @ApiProperty({ example: 1, description: 'Product ID' })
  productId!: number;

  @ApiProperty({ example: 'SKU-HEADPHONES', description: 'Product SKU' })
  sku!: string;

  @ApiProperty({
    example: 'Wireless Headphones',
    description: 'Product title',
  })
  productTitle!: string;

  @ApiProperty({ example: 150, description: 'Available quantity' })
  availableQuantity!: number;

  @ApiProperty({ example: 10, description: 'Reserved quantity' })
  reservedQuantity!: number;

  @ApiProperty({
    example: 160,
    description: 'Total quantity (available + reserved)',
  })
  totalQuantity!: number;

  @ApiProperty({
    example: '2025-10-31T12:30:00.000Z',
    description: 'Last update date',
  })
  updatedAt!: string;
}

/** Paginated list envelope. */
export class PaginatedInventoryResponseDto {
  @ApiProperty({ type: [InventoryListItemResponseDto] })
  items!: InventoryListItemResponseDto[];

  @ApiProperty({ example: 15 })
  total!: number;

  @ApiProperty({ example: 1 })
  page!: number;

  @ApiProperty({ example: 10 })
  limit!: number;

  @ApiProperty({ example: 2 })
  totalPages!: number;
}

/**
 * Stock entity primitives after adjust and low-stock list items.
 * Does not include product title/SKU.
 */
export class InventoryStockResponseDto {
  @ApiPropertyOptional({
    example: 1,
    description: 'Inventory record ID',
    nullable: true,
    type: Number,
  })
  id!: number | null;

  @ApiProperty({ example: 1, description: 'Product ID', type: Number })
  productId!: number;

  @ApiProperty({
    example: 150,
    description: 'Available quantity',
    type: Number,
  })
  availableQuantity!: number;

  @ApiProperty({ example: 10, description: 'Reserved quantity', type: Number })
  reservedQuantity!: number;

  @ApiProperty({
    example: 160,
    description: 'Total quantity (available + reserved)',
    type: Number,
  })
  totalQuantity!: number;

  @ApiProperty({
    example: 10,
    description: 'Low stock threshold',
    type: Number,
  })
  lowStockThreshold!: number;

  @ApiPropertyOptional({
    example: '2025-10-31T10:00:00.000Z',
    description: 'Last restock date',
    nullable: true,
    type: String,
    format: 'date-time',
  })
  lastRestockDate!: string | null;

  @ApiProperty({
    example: '2025-10-31T12:30:00.000Z',
    description: 'Created at',
    type: String,
    format: 'date-time',
  })
  createdAt!: string;

  @ApiProperty({
    example: '2025-10-31T12:30:00.000Z',
    description: 'Last update date',
    type: String,
    format: 'date-time',
  })
  updatedAt!: string;
}
