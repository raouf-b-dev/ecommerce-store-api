import {
  IsOptional,
  IsIn,
  IsBoolean,
  IsString,
  Min,
  Max,
} from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListProductsQueryDto {
  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    minimum: 1,
    default: 1,
    example: 1,
  })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @Min(1)
  @Max(100)
  @ApiPropertyOptional({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
    default: 10,
    example: 10,
  })
  limit?: number = 10;

  @IsOptional()
  @Type(() => Number)
  @ApiPropertyOptional({
    description: 'Filter products by category ID',
    example: 1,
  })
  categoryId?: number;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({
    description: 'Search by name, description, or SKU',
    example: 'laptop',
  })
  search?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @ApiPropertyOptional({
    description: 'Filter by active status',
  })
  isActive?: boolean;

  @IsOptional()
  @Type(() => Number)
  @ApiPropertyOptional({
    description: 'Minimum price (major currency units)',
    example: 10,
  })
  minPrice?: number;

  @IsOptional()
  @Type(() => Number)
  @ApiPropertyOptional({
    description: 'Maximum price (major currency units)',
    example: 1000,
  })
  maxPrice?: number;

  @IsOptional()
  @IsIn(['createdAt', 'price', 'name', 'id'])
  @ApiPropertyOptional({
    enum: ['createdAt', 'price', 'name', 'id'],
    default: 'createdAt',
  })
  sortBy?: 'createdAt' | 'price' | 'name' | 'id' = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  @Transform(({ value }) => value?.toLowerCase())
  @ApiPropertyOptional({
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  sortOrder?: 'asc' | 'desc' = 'desc';
}
