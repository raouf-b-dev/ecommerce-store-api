// src/modules/inventory/presentation/dto/inventory-response.dto.ts
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
 * Stock entity primitives after adjust (and legacy low-stock list items).
 * Does not include product title/SKU.
 */
export class InventoryStockResponseDto {
  @ApiProperty({ example: 1, description: 'Inventory record ID' })
  id!: number;

  @ApiProperty({ example: 1, description: 'Product ID' })
  productId!: number;

  @ApiProperty({ example: 150, description: 'Available quantity' })
  availableQuantity!: number;

  @ApiProperty({ example: 10, description: 'Reserved quantity' })
  reservedQuantity!: number;

  @ApiProperty({
    example: 160,
    description: 'Total quantity (available + reserved)',
  })
  totalQuantity!: number;

  @ApiProperty({ example: 10, description: 'Low stock threshold' })
  lowStockThreshold!: number;

  @ApiPropertyOptional({
    example: '2025-10-31T10:00:00.000Z',
    description: 'Last restock date',
    nullable: true,
  })
  lastRestockDate?: Date | null;

  @ApiProperty({
    example: '2025-10-31T12:30:00.000Z',
    description: 'Created at',
  })
  createdAt!: Date;

  @ApiProperty({
    example: '2025-10-31T12:30:00.000Z',
    description: 'Last update date',
  })
  updatedAt!: Date;
}

/**
 * @deprecated Prefer InventoryListItemResponseDto or InventoryStockResponseDto.
 * Kept for backward-compatible Swagger references on low-stock until that endpoint is reshaped.
 */
export class InventoryResponseDto {
  @ApiProperty({
    example: 1,
    description: 'Inventory record ID',
  })
  id!: number;

  @ApiProperty({
    example: 1,
    description: 'Product ID',
  })
  productId!: number;

  @ApiProperty({
    example: 'Wireless Headphones',
    description: 'Product name',
  })
  productName!: string;

  @ApiProperty({
    example: 150,
    description: 'Available quantity',
  })
  availableQuantity!: number;

  @ApiProperty({
    example: 10,
    description: 'Reserved quantity',
  })
  reservedQuantity!: number;

  @ApiProperty({
    example: 160,
    description: 'Total quantity (available + reserved)',
  })
  totalQuantity!: number;

  @ApiProperty({
    example: 10,
    description: 'Low stock threshold',
  })
  lowStockThreshold!: number;

  @ApiProperty({
    example: false,
    description: 'Whether stock is low',
  })
  isLowStock!: boolean;

  @ApiProperty({
    example: true,
    description: 'Whether product is in stock',
  })
  inStock!: boolean;

  @ApiPropertyOptional({
    example: '2025-10-31T10:00:00Z',
    description: 'Last restock date',
  })
  lastRestockDate?: Date;

  @ApiProperty({
    example: '2025-10-31T12:30:00Z',
    description: 'Last update date',
  })
  updatedAt!: Date;
}
