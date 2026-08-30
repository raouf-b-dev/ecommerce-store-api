import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class InventoryAlertItemDto {
  @ApiProperty()
  productId!: number;

  @ApiProperty()
  productTitle!: string;

  @ApiPropertyOptional({ nullable: true })
  sku!: string | null;

  @ApiProperty()
  availableQuantity!: number;

  @ApiProperty()
  lowStockThreshold!: number;
}

export class InventoryAlertsResponseDto {
  @ApiProperty({ type: [InventoryAlertItemDto] })
  items!: InventoryAlertItemDto[];
}
