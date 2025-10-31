// src/modules/inventory/presentation/dto/inventory-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InventoryResponseDto {
  @ApiProperty({
    example: 'inv-123',
    description: 'Inventory record ID',
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
    example: 150,
    description: 'Available quantity',
  })
  availableQuantity: number;

  @ApiProperty({
    example: 10,
    description: 'Reserved quantity',
  })
  reservedQuantity: number;

  @ApiProperty({
    example: 160,
    description: 'Total quantity (available + reserved)',
  })
  totalQuantity: number;

  @ApiProperty({
    example: 10,
    description: 'Low stock threshold',
  })
  lowStockThreshold: number;

  @ApiProperty({
    example: false,
    description: 'Whether stock is low',
  })
  isLowStock: boolean;

  @ApiProperty({
    example: true,
    description: 'Whether product is in stock',
  })
  inStock: boolean;

  @ApiPropertyOptional({
    example: '2025-10-31T10:00:00Z',
    description: 'Last restock date',
  })
  lastRestockDate?: Date;

  @ApiProperty({
    example: '2025-10-31T12:30:00Z',
    description: 'Last update date',
  })
  updatedAt: Date;
}
