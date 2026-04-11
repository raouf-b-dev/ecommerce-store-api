// src/modules/orders/presentation/dto/payment-info.dto.ts
import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethodType } from '../../../../shared-kernel/domain/value-objects/payment-method';

export class PaymentMethodDto {
  @ApiProperty({
    example: PaymentMethodType.CASH_ON_DELIVERY,
    description: 'Payment method',
    enum: PaymentMethodType,
  })
  @IsEnum(PaymentMethodType)
  paymentMethod: PaymentMethodType;
}
