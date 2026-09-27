import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class BulkCheckStockItemDto {
  @ApiProperty({ type: Number, example: 1 })
  @IsInt()
  @Min(1)
  productId!: number;

  @ApiPropertyOptional({ type: Number, example: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  quantity?: number;
}

export const BulkCheckStockBodyDto = [BulkCheckStockItemDto];
