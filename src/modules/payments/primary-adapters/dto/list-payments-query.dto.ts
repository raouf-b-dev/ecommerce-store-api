// src/modules/payments/presentation/dto/list-payments-query.dto.ts
import { IsOptional, IsEnum, IsNumber, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethodType } from '../../../../shared-kernel/domain/value-objects/payment-method';
import { PaymentStatusType } from '../../core/domain/value-objects/payment-status';

export class ListPaymentsQueryDto {
  @ApiPropertyOptional({
    example: 'order-123',
    description: 'Filter by order ID',
  })
  @IsOptional()
  @IsNumber()
  orderId?: number;

  @ApiPropertyOptional({
    example: 123,
    description: 'Filter by customer ID',
  })
  @IsOptional()
  @IsNumber()
  customerId?: number;

  @ApiPropertyOptional({
    enum: PaymentStatusType,
    example: PaymentStatusType.COMPLETED,
    description: 'Filter by payment status',
  })
  @IsOptional()
  @IsEnum(PaymentStatusType)
  status?: PaymentStatusType;

  @ApiPropertyOptional({
    enum: PaymentMethodType,
    example: PaymentMethodType.CREDIT_CARD,
    description: 'Filter by payment method',
  })
  @IsOptional()
  @IsEnum(PaymentMethodType)
  paymentMethod?: PaymentMethodType;

  @ApiPropertyOptional({
    example: 1,
    description: 'Page number',
    minimum: 1,
    default: 1,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Type(() => Number)
  page?: number = 1;

  @ApiPropertyOptional({
    example: 20,
    description: 'Items per page',
    minimum: 1,
    maximum: 100,
    default: 20,
  })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(100)
  @Type(() => Number)
  limit?: number = 20;
}
