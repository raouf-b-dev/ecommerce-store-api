import { IsOptional, IsIn } from 'class-validator';
import { Type, Transform } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListPaymentsQueryDto {
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
    description: 'Filter payments by user ID',
  })
  userId?: number;

  @IsOptional()
  @Type(() => Number)
  @ApiPropertyOptional({
    description: 'Filter payments by order ID',
  })
  orderId?: number;

  @IsOptional()
  @ApiPropertyOptional({
    description: 'Filter payments by status',
  })
  status?: string;

  @IsOptional()
  @ApiPropertyOptional({
    description: 'Filter payments by user email',
  })
  userEmail?: string;

  @IsOptional()
  @ApiPropertyOptional({
    description: 'Filter payments by user name',
  })
  userName?: string;

  @IsOptional()
  @IsIn(['createdAt', 'amount', 'status', 'id'])
  @ApiPropertyOptional({
    enum: ['createdAt', 'amount', 'status', 'id'],
    default: 'createdAt',
  })
  sortBy?: 'createdAt' | 'amount' | 'status' | 'id' = 'createdAt';

  @IsOptional()
  @IsIn(['asc', 'desc'])
  @Transform(({ value }) => value?.toLowerCase())
  @ApiPropertyOptional({
    enum: ['asc', 'desc'],
    default: 'desc',
  })
  sortOrder?: 'asc' | 'desc' = 'desc';
}
