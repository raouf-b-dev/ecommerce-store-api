import { IsOptional, IsIn, IsBoolean } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListInventoryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    minimum: 1,
    default: 1,
  })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @ApiPropertyOptional({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
    default: 10,
  })
  limit?: number = 10;

  @IsOptional()
  @Type(() => Number)
  @ApiPropertyOptional({
    description: 'Filter inventory by product ID',
  })
  productId?: number;

  @IsOptional()
  @ApiPropertyOptional({
    description: 'Filter inventory by product SKU',
  })
  sku?: string;

  @IsOptional()
  @ApiPropertyOptional({
    description: 'Filter inventory by product title',
  })
  productTitle?: string;

  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  @ApiPropertyOptional({
    description: 'Filter only low stock items',
  })
  lowStockOnly?: boolean;

  @IsOptional()
  @IsIn(['updatedAt', 'availableQuantity', 'totalQuantity', 'productId'])
  @ApiPropertyOptional({
    enum: ['updatedAt', 'availableQuantity', 'totalQuantity', 'productId'],
    default: 'updatedAt',
  })
  sortBy?: 'updatedAt' | 'availableQuantity' | 'totalQuantity' | 'productId' =
    'updatedAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  @Transform(({ value }) => value?.toLowerCase())
  @ApiPropertyOptional({
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  sortOrder?: 'asc' | 'desc' = 'desc';
}
