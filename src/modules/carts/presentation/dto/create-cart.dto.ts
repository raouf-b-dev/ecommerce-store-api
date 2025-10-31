// src/modules/carts/presentation/dto/create-cart.dto.ts
import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCartDto {
  @ApiPropertyOptional({
    example: 'user-123',
    description: 'Customer ID for authenticated users',
  })
  @IsOptional()
  @IsString()
  customerId?: string;

  @ApiPropertyOptional({
    example: 'session-abc-xyz',
    description: 'Session ID for guest users',
  })
  @IsOptional()
  @IsString()
  sessionId?: string;
}
