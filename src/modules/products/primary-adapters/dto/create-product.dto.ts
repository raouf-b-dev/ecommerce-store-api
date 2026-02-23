// src/modules/products/presentation/dto/create-product.dto.ts
import { IsString, IsOptional, IsNumber, IsPositive } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'Laptop', description: 'Product name' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'High-end gaming laptop' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'SKU12345' })
  @IsOptional()
  @IsString()
  sku?: string;

  @ApiProperty({ example: 1200 })
  @IsNumber()
  @IsPositive()
  price: number;
}
