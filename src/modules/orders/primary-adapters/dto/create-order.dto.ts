// src/modules/orders/presentation/dto/create-order.dto.ts
import {
  IsArray,
  ValidateNested,
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateOrderItemDto } from './create-order-item.dto';
import { ShippingAddressDto } from './shipping-address.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethodType } from '../../../payments/core/domain';

export class CreateOrderDto {
  @ApiProperty({
    example: 123,
    description: 'Customer ID placing the order',
  })
  @IsNumber()
  customerId: number;

  @ApiProperty({
    type: [CreateOrderItemDto],
    description: 'List of order items',
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items: CreateOrderItemDto[];

  @ApiProperty({
    type: ShippingAddressDto,
    description: 'Shipping address details',
  })
  @ValidateNested()
  @Type(() => ShippingAddressDto)
  shippingAddress: ShippingAddressDto;

  @ApiProperty({
    example: PaymentMethodType.CASH_ON_DELIVERY,
    description: 'Payment method for the order',
    enum: PaymentMethodType,
  })
  @IsEnum(PaymentMethodType)
  paymentMethod: PaymentMethodType;

  @ApiPropertyOptional({
    example: 'Please leave at the front door',
    description: 'Special delivery instructions',
  })
  @IsOptional()
  @IsString()
  customerNotes?: string;
}
