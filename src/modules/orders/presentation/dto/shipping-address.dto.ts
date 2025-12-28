// src/modules/orders/presentation/dto/shipping-address.dto.ts
import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ShippingAddressProps } from '../../domain/value-objects/shipping-address';

export class ShippingAddressDto {
  @ApiProperty({ example: 'John', description: 'First name' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'Last name' })
  @IsString()
  lastName: string;

  @ApiProperty({
    example: '123 Main Street',
    description: 'Street address',
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

  @ApiProperty({ example: 'New York', description: 'City' })
  @IsString()
  city: string;

  @ApiProperty({ example: 'NY', description: 'State or province' })
  @IsString()
  state: string;

  @ApiProperty({ example: '10001', description: 'Postal code' })
  @IsString()
  postalCode: string;

  @ApiProperty({
    example: 'US',
    description: 'Country code (ISO 3166-1 alpha-2)',
  })
  @IsString()
  country: string;

  @ApiPropertyOptional({
    example: '+1234567890',
    description: 'Contact phone number',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    example: 'Leave at front door',
    description: 'Delivery instructions',
  })
  @IsOptional()
  @IsString()
  deliveryInstructions?: string;

  static fromDomain(props: ShippingAddressProps): ShippingAddressDto {
    return {
      firstName: props.firstName,
      lastName: props.lastName,
      street: props.street,
      street2: props.street2 ?? undefined,
      city: props.city,
      state: props.state,
      postalCode: props.postalCode,
      country: props.country,
      phone: props.phone ?? undefined,
      deliveryInstructions: props.deliveryInstructions ?? undefined,
    };
  }
}
