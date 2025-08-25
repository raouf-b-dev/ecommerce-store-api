import { IsString, IsArray, ValidateNested, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { CreateOrderItemDto } from './create-order-item.dto';
import { OrderStatus } from '../../domain/value-objects/order-status';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderDto {
  @ApiProperty({ example: 'cust_456', description: 'ID of the customer' })
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
    enum: ['pending', 'paid', 'shipped', 'cancelled'],
    example: 'pending',
  })
  @IsEnum(['pending', 'paid', 'shipped', 'cancelled'])
  status: OrderStatus;
}
