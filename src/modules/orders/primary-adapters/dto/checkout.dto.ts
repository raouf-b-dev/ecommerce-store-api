// src/modules/orders/presentation/dto/checkout.dto.ts
import {
  IsEnum,
  IsOptional,
  IsString,
  ValidateNested,
  IsUUID,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethodType } from '../../../payments/core/domain';
import { ShippingAddressDto } from './shipping-address.dto';

export class CheckoutDto {
  @ApiProperty({ description: 'Cart ID to checkout' })
  @IsUUID()
  cartId: number;

  @ApiPropertyOptional({ description: 'Shipping address for the order' })
  @IsOptional()
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress?: ShippingAddressDto;

  @ApiProperty({ description: 'Payment method', enum: PaymentMethodType })
  @IsEnum(PaymentMethodType)
  paymentMethod: PaymentMethodType;

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
