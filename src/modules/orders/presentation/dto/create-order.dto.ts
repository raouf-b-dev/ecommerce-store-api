// src/modules/orders/presentation/dto/create-order.dto.ts
import {
  IsArray,
  ValidateNested,
  IsOptional,
  IsString,
  IsEnum,
} from 'class-validator';
import { Type } from 'class-transformer';
import { CreateOrderItemDto } from './create-order-item.dto';
import { ShippingAddressDto } from './shipping-address.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethodType } from '../../../payments/domain';

export class CreateOrderDto {
  @ApiProperty({
    example: 'cust_abc123',
    description: 'Customer ID placing the order',
  })
  @IsString()
  customerId: string;

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
