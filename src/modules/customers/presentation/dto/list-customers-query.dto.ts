// src/modules/customers/presentation/dto/list-customers-query.dto.ts
import { IsOptional, IsString, IsNumber, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class ListCustomersQueryDto {
  @ApiPropertyOptional({
    example: 'john',
    description: 'Search by name or email',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    example: 'john.doe@example.com',
    description: 'Filter by email',
  })
  @IsOptional()
  @IsString()
  email?: string;

  @ApiPropertyOptional({
    example: '+1234567890',
    description: 'Filter by phone',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    example: 1,
    description: 'Page number',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number;

  @ApiPropertyOptional({
    example: 20,
    description: 'Items per page',
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  limit?: number;
}
