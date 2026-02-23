// src/modules/carts/presentation/dto/create-cart.dto.ts
import { IsOptional, IsNumber } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCartDto {
  @ApiPropertyOptional({
    example: 123,
    description: 'Customer ID for authenticated users',
  })
  @IsOptional()
  @IsNumber()
  customerId?: number;

  @ApiPropertyOptional({
    example: 123,
    description: 'Session ID for guest users',
  })
  @IsOptional()
  @IsNumber()
  sessionId?: number;
}
