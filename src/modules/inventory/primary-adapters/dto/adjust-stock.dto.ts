// src/modules/inventory/presentation/dto/adjust-stock.dto.ts
import { IsNumber, IsString, IsOptional, IsEnum, IsInt } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

import { StockAdjustmentType } from '../../core/domain/value-objects/stock-adjustment-type';
export class AdjustStockDto {
  @ApiProperty({
    example: 50,
    description: 'Quantity to adjust',
  })
  @IsNumber()
  @IsInt()
  quantity: number;

  @ApiProperty({
    enum: StockAdjustmentType,
    example: StockAdjustmentType.ADD,
    description: 'Type of adjustment',
  })
  @IsEnum(StockAdjustmentType)
  type: StockAdjustmentType;

  @ApiPropertyOptional({
    example: 'Received new shipment',
    description: 'Reason for stock adjustment',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
