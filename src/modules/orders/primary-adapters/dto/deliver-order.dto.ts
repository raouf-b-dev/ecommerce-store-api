// src/modules/orders/primary-adapters/dto/deliver-order.dto.ts
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

export class DeliverOrderDto {
  @ApiPropertyOptional({
    example: 'Left package at front desk',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notes?: string;
}
