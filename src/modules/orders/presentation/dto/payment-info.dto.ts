// src/modules/orders/presentation/dto/payment-info.dto.ts
import {
  IsString,
  IsNumber,
  IsOptional,
  IsEnum,
  IsDateString,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentStatus } from '../../domain/value-objects/payment-status';
import { PaymentMethod } from '../../domain/value-objects/payment-method';

export class PaymentInfoDto {
  @ApiProperty({
    example: PaymentMethod.CASH_ON_DELIVERY,
    description: 'Payment method',
    enum: PaymentMethod,
  })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiPropertyOptional({
    example: 'Payment confirmed by driver',
    description: 'Payment notes',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
