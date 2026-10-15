import { IsEnum, IsOptional, IsString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethodType } from '../../../../shared-kernel/domain/value-objects/payment-method';

export class OrderPaymentMethodDetailsDto {
  @ApiPropertyOptional({ example: 'tok_visa1234' })
  @IsOptional()
  @IsString()
  token?: string;

  @ApiPropertyOptional({ example: '4242' })
  @IsOptional()
  @IsString()
  cardLast4?: string;

  @ApiPropertyOptional({ example: 'Visa' })
  @IsOptional()
  @IsString()
  cardBrand?: string;

  @ApiPropertyOptional({ example: 'wallet@example.com' })
  @IsOptional()
  @IsString()
  walletId?: string;
}

export class CreateOrderPaymentDto {
  @ApiProperty({
    enum: PaymentMethodType,
    example: PaymentMethodType.CARD,
    description: 'Payment method',
  })
  @IsEnum(PaymentMethodType)
  paymentMethod!: PaymentMethodType;

  @ApiPropertyOptional({ type: OrderPaymentMethodDetailsDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => OrderPaymentMethodDetailsDto)
  paymentMethodDetails?: OrderPaymentMethodDetailsDto;
}
