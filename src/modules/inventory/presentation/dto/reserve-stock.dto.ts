// src/modules/inventory/presentation/dto/reserve-stock.dto.ts
import { IsArray, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';
import { ReserveStockItemDto } from './reserve-stock-item.dto';

export class ReserveStockDto {
  @ApiProperty({
    example: 123,
    description: 'Order ID for tracking',
  })
  @IsNumber()
  orderId: number;

  @ApiProperty({
    type: [ReserveStockItemDto],
    description: 'Items to reserve',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ReserveStockItemDto)
  items: ReserveStockItemDto[];
}
