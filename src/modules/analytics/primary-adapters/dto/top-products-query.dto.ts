import { IsInt, IsOptional, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AnalyticsPeriodQueryDto } from './analytics-period-query.dto';

export class TopProductsQueryDto extends AnalyticsPeriodQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(10)
  @ApiPropertyOptional({
    description: 'Max products to return (default 5, max 10)',
    minimum: 1,
    maximum: 10,
    default: 5,
  })
  limit?: number = 5;
}
