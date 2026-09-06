import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class InventoryAlertsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @ApiPropertyOptional({
    description: 'Max alert rows (default 20, max 100)',
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  limit?: number = 20;
}
