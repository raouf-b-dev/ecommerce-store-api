// src/modules/customers/presentation/dto/update-address.dto.ts
import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { AddressType } from './add-address.dto';

export class UpdateAddressDto {
  @ApiPropertyOptional({
    example: '123 Main Street',
    description: 'Street address line 1',
  })
  @IsOptional()
  @IsString()
  street?: string;

  @ApiPropertyOptional({
    example: 'Apt 4B',
    description: 'Street address line 2',
  })
  @IsOptional()
  @IsString()
  street2?: string;

  @ApiPropertyOptional({
    example: 'New York',
    description: 'City',
  })
  @IsOptional()
  @IsString()
  city?: string;

  @ApiPropertyOptional({
    example: 'NY',
    description: 'State/Province',
  })
  @IsOptional()
  @IsString()
  state?: string;

  @ApiPropertyOptional({
    example: '10001',
    description: 'Postal/ZIP code',
  })
  @IsOptional()
  @IsString()
  postalCode?: string;

  @ApiPropertyOptional({
    example: 'US',
    description: 'Country code (ISO 3166-1 alpha-2)',
  })
  @IsOptional()
  @IsString()
  country?: string;

  @ApiPropertyOptional({
    enum: AddressType,
    example: AddressType.HOME,
    description: 'Address type',
  })
  @IsOptional()
  @IsEnum(AddressType)
  type?: AddressType;

  @ApiPropertyOptional({
    example: 'Leave at front door',
    description: 'Delivery instructions',
  })
  @IsOptional()
  @IsString()
  deliveryInstructions?: string;
}
