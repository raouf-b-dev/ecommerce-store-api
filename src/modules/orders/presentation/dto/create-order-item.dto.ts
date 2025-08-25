import {
  IsString,
  IsNumber,
  IsPositive,
  IsOptional,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateOrderItemDto {
  @ApiProperty({ example: 'prod_123', description: 'ID of the product' })
  @IsString()
  productId: string;

  @ApiPropertyOptional({
    example: 'Laptop',
    description: 'Optional product name',
  })
  @IsOptional()
  @IsString()
  productName?: string;

  @ApiProperty({ example: 1200, description: 'Unit price of the product' })
  @IsNumber()
  @IsPositive()
  unitPrice: number;

  @ApiProperty({ example: 2, description: 'Quantity ordered' })
  @IsNumber()
  @Min(1)
  quantity: number;

  @ApiProperty({ example: 2400, description: 'Total for this order line' })
  @IsNumber()
  @IsPositive()
  lineTotal: number;
}
