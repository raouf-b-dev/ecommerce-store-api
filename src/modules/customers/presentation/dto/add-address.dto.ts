// src/modules/customers/presentation/dto/add-address.dto.ts
import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum AddressType {
  HOME = 'HOME',
  WORK = 'WORK',
  OTHER = 'OTHER',
}

export class AddAddressDto {
  @ApiProperty({
    example: '123 Main Street',
    description: 'Street address line 1',
  })
  @IsString()
  street: string;

  @ApiPropertyOptional({
    example: 'Apt 4B',
    description: 'Street address line 2',
  })
  @IsOptional()
  @IsString()
  street2?: string;

  @ApiProperty({
    example: 'New York',
    description: 'City',
  })
  @IsString()
  city: string;

  @ApiProperty({
    example: 'NY',
    description: 'State/Province',
  })
  @IsString()
  state: string;

  @ApiProperty({
    example: '10001',
    description: 'Postal/ZIP code',
  })
  @IsString()
  postalCode: string;

  @ApiProperty({
    example: 'US',
    description: 'Country code (ISO 3166-1 alpha-2)',
  })
  @IsString()
  country: string;

  @ApiPropertyOptional({
    enum: AddressType,
    example: AddressType.HOME,
    description: 'Address type',
  })
  @IsOptional()
  @IsEnum(AddressType)
  type?: AddressType;

  @ApiPropertyOptional({
    example: true,
    description: 'Set as default address',
  })
  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;

  @ApiPropertyOptional({
    example: 'Leave at front door',
    description: 'Delivery instructions',
  })
  @IsOptional()
  @IsString()
  deliveryInstructions?: string;
}
