// src/modules/products/presentation/dto/create-product.dto.ts
import {
  IsString,
  IsOptional,
  IsNumber,
  IsPositive,
  IsInt,
  Length,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateProductDto {
  @ApiProperty({ example: 'Laptop', description: 'Product name' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ example: 'laptop' })
  @IsOptional()
  @IsString()
  slug?: string;

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
  price!: number;

  @ApiProperty({ example: 'USD', description: 'ISO 4217 currency code' })
  @IsString()
  @Length(3, 3)
  currency!: string;

  @ApiPropertyOptional({ example: 'https://example.com/laptop.jpg' })
  @IsOptional()
  @IsString()
  imageUrl?: string;

  @ApiProperty({ example: 1, description: 'Active category id' })
  @IsInt()
  @IsPositive()
  categoryId!: number;
}
