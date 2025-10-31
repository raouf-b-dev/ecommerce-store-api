// src/modules/payments/presentation/dto/create-payment.dto.ts
import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethodDetailsDto } from './payment-method-details.dto';

export enum PaymentMethod {
  CREDIT_CARD = 'CREDIT_CARD',
  DEBIT_CARD = 'DEBIT_CARD',
  CASH_ON_DELIVERY = 'CASH_ON_DELIVERY',
  BANK_TRANSFER = 'BANK_TRANSFER',
  DIGITAL_WALLET = 'DIGITAL_WALLET',
}

export class CreatePaymentDto {
  @ApiProperty({
    example: 'order-123',
    description: 'Order ID',
  })
  @IsString()
  orderId: string;

  @ApiProperty({
    example: 299.99,
    description: 'Payment amount',
  })
  @IsNumber()
  @Min(0)
  amount: number;

  @ApiProperty({
    enum: PaymentMethod,
    example: PaymentMethod.CREDIT_CARD,
    description: 'Payment method',
  })
  @IsEnum(PaymentMethod)
  paymentMethod: PaymentMethod;

  @ApiProperty({
    example: 'USD',
    description: 'Currency code',
  })
  @IsString()
  currency: string;

  @ApiPropertyOptional({
    type: PaymentMethodDetailsDto,
    description: 'Payment method specific details',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentMethodDetailsDto)
  paymentMethodDetails?: PaymentMethodDetailsDto;

  @ApiPropertyOptional({
    example: 'user-123',
    description: 'Customer ID',
  })
  @IsOptional()
  @IsString()
  customerId?: string;
}
