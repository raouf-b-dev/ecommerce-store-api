import { IsOptional, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CheckStockQueryDto {
  @ApiPropertyOptional({
    example: 2,
    minimum: 1,
    description: 'Quantity to check against available stock (defaults to 1)',
  })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity?: number;
}
