// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

// src/modules/orders/presentation/dto/checkout.dto.ts
import {
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethodType } from '../../../../shared-kernel/domain/value-objects/payment-method';
import { ShippingAddressDto } from './shipping-address.dto';

export class CheckoutDto {
  @ApiProperty({ description: 'Cart ID to checkout' })
  @IsNumber()
  cartId!: number;

  @ApiPropertyOptional({
    description:
      'Shipping address for the order. When omitted, the user default address is used; if the user has no default address, checkout returns 400.',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress?: ShippingAddressDto;

  @ApiProperty({ description: 'Payment method', enum: PaymentMethodType })
  @IsEnum(PaymentMethodType)
  paymentMethod!: PaymentMethodType;

  @ApiPropertyOptional({ description: 'Customer notes for the order' })
  @IsOptional()
  @IsString()
  customerNotes?: string;

  @ApiPropertyOptional({
    description: 'Idempotency key for preventing duplicate checkouts',
    example: 'checkout-abc123-xyz789',
  })
  @IsOptional()
  @IsString()
  idempotencyKey?: string;
}
