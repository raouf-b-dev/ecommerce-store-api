// src/modules/orders/presentation/dto/create-order.dto.ts
import { IsArray, ValidateNested, IsOptional, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateOrderItemDto } from './create-order-item.dto';
import { ShippingAddressDto } from './shipping-address.dto';
import { CustomerInfoDto } from './customer-info.dto';
import { PaymentInfoDto } from './payment-info.dto';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrderDto {
  @ApiProperty({
    type: CustomerInfoDto,
    description: 'Customer information',
  })
  @ValidateNested()
  @Type(() => CustomerInfoDto)
  customerInfo: CustomerInfoDto;

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
    type: PaymentInfoDto,
    description: 'Payment information',
  })
  @ValidateNested()
  @Type(() => PaymentInfoDto)
  paymentInfo: PaymentInfoDto;

  @ApiPropertyOptional({
    example: 'Please leave at the front door',
    description: 'Special delivery instructions',
  })
  @IsOptional()
  @IsString()
  customerNotes?: string;
}
