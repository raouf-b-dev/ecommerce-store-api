// src/modules/inventory/presentation/dto/low-stock-query.dto.ts
import { IsOptional, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class LowStockQueryDto {
  @ApiPropertyOptional({
    example: 10,
    description: 'Threshold for low stock (default: 10)',
  })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  threshold?: number;

  @ApiPropertyOptional({
    example: 1,
    description: 'Page number',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 20,
    description: 'Items per page',
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;
}
