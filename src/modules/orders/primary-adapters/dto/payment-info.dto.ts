// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

// src/modules/orders/presentation/dto/payment-info.dto.ts
import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { PaymentMethodType } from '../../../../shared-kernel/domain/value-objects/payment-method';

export class PaymentMethodDto {
  @ApiProperty({
    example: PaymentMethodType.STRIPE,
    description: 'Payment method',
    enum: PaymentMethodType,
  })
  @IsEnum(PaymentMethodType)
  paymentMethod!: PaymentMethodType;
}
