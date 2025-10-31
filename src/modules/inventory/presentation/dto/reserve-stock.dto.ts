// src/modules/inventory/presentation/dto/reserve-stock.dto.ts
import { IsArray, ValidateNested, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ReserveStockItemDto } from './reserve-stock-item.dto';

export class ReserveStockDto {
  @ApiProperty({
    example: 'order-123',
    description: 'Order ID for tracking',
  })
  @IsString()
  orderId: string;

  @ApiProperty({
    type: [ReserveStockItemDto],
    description: 'Items to reserve',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReserveStockItemDto)
  items: ReserveStockItemDto[];
}
