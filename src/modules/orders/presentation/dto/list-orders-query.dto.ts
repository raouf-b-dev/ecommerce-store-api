import { IsOptional, IsEnum, IsIn, IsDateString } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { OrderStatus } from '../../domain/value-objects/order-status';

export class ListOrdersQueryDto {
  @IsOptional()
  @Type(() => Number)
  @ApiPropertyOptional({
    description: 'Page number for pagination',
    minimum: 1,
    default: 1,
    example: 1,
  })
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @ApiPropertyOptional({
    description: 'Number of items per page',
    minimum: 1,
    maximum: 100,
    default: 10,
    example: 10,
  })
  limit?: number = 10;

  @IsOptional()
  @ApiPropertyOptional({
    description: 'Filter orders by customer ID',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  customerId?: string;

  @IsOptional()
  @ApiPropertyOptional({
    description: 'Filter orders by customer email',
    example: 'customer@example.com',
  })
  customerEmail?: string;

  @IsOptional()
  @IsEnum(OrderStatus)
  @ApiPropertyOptional({
    enum: OrderStatus,
    description: 'Filter orders by status',
  })
  status?: OrderStatus;

  @IsOptional()
  @IsIn(['createdAt', 'updatedAt', 'totalPrice'])
  @ApiPropertyOptional({
    enum: ['createdAt', 'updatedAt', 'totalPrice'],
    description: 'Field to sort by',
    default: 'createdAt',
  })
  sortBy?: 'createdAt' | 'updatedAt' | 'totalPrice' = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  @Transform(({ value }) => value?.toLowerCase())
  @ApiPropertyOptional({
    enum: ['asc', 'desc'],
    description: 'Sort order',
    default: 'desc',
  })
  sortOrder?: 'asc' | 'desc' = 'desc';

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({
    description: 'Filter orders created after this date (ISO 8601)',
    example: '2024-01-01T00:00:00.000Z',
  })
  createdAfter?: string;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({
    description: 'Filter orders created before this date (ISO 8601)',
    example: '2024-12-31T23:59:59.999Z',
  })
  createdBefore?: string;

  @IsOptional()
  @Type(() => Number)
  @ApiPropertyOptional({
    description: 'Filter orders with total price greater than',
    example: 50.0,
  })
  minAmount?: number;

  @IsOptional()
  @Type(() => Number)
  @ApiPropertyOptional({
    description: 'Filter orders with total price less than',
    example: 1000.0,
  })
  maxAmount?: number;
}
