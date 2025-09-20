// src/modules/orders/presentation/dto/update-order.dto.ts
import { PartialType, OmitType } from '@nestjs/mapped-types';
import { IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateOrderDto } from './create-order.dto';
import { CustomerInfoEditableDto } from './customer-info-editable.dto';
import { PaymentInfoEditableDto } from './payment-info-editable.dto';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateOrderDto extends PartialType(
  OmitType(CreateOrderDto, ['customerInfo', 'paymentInfo'] as const),
) {
  @ApiPropertyOptional({
    type: CustomerInfoEditableDto,
    description: 'Editable customer information (excludes customerId)',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => CustomerInfoEditableDto)
  customerInfo?: CustomerInfoEditableDto;

  @ApiPropertyOptional({
    type: PaymentInfoEditableDto,
    description: 'Editable payment information (mainly for COD status updates)',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => PaymentInfoEditableDto)
  paymentInfo?: PaymentInfoEditableDto;
}
