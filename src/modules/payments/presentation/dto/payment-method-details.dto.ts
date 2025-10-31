// src/modules/payments/presentation/dto/payment-method-details.dto.ts
import { IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaymentMethodDetailsDto {
  @ApiPropertyOptional({
    example: 'tok_visa1234',
    description: 'Payment token from gateway',
  })
  @IsOptional()
  @IsString()
  token?: string;

  @ApiPropertyOptional({
    example: '**** **** **** 1234',
    description: 'Masked card number',
  })
  @IsOptional()
  @IsString()
  cardLast4?: string;

  @ApiPropertyOptional({
    example: 'Visa',
    description: 'Card brand',
  })
  @IsOptional()
  @IsString()
  cardBrand?: string;

  @ApiPropertyOptional({
    example: 'wallet@example.com',
    description: 'Digital wallet identifier',
  })
  @IsOptional()
  @IsString()
  walletId?: string;
}
