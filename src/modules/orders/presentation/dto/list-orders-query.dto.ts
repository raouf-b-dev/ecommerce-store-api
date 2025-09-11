import { IsOptional, IsEnum, IsIn } from 'class-validator';
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
}
