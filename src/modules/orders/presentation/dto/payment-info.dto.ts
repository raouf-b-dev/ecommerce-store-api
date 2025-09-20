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

  @ApiProperty({
    example: PaymentStatus.PENDING,
    description: 'Payment status',
    enum: PaymentStatus,
  })
  @IsEnum(PaymentStatus)
  status: PaymentStatus;

  @ApiProperty({
    example: 99.99,
    description: 'Payment amount',
  })
  @IsNumber({ maxDecimalPlaces: 2 })
  amount: number;

  @ApiPropertyOptional({
    example: 'txn_12345',
    description: 'Transaction ID from payment gateway',
  })
  @IsOptional()
  @IsString()
  transactionId?: string;

  @ApiPropertyOptional({
    example: '2024-01-15T10:30:00Z',
    description: 'When payment was completed',
  })
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @ApiPropertyOptional({
    example: 'Payment confirmed by driver',
    description: 'Payment notes',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
