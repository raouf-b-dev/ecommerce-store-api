import { IsNumber, IsString, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateOrderItemDto {
  @ApiProperty({ example: 123, description: 'ID of the product' })
  @IsNumber()
  productId!: number;

  @ApiProperty({ example: 'Product Name', description: 'Name of the product' })
  @IsString()
  productName!: string;

  @ApiProperty({
    example: 2999,
    description: 'Unit price in minor currency units',
    type: 'integer',
  })
  @IsNumber()
  unitPrice!: number;

  @ApiProperty({ example: 2, description: 'Quantity ordered' })
  @IsNumber()
  @Min(1)
  quantity!: number;
}
