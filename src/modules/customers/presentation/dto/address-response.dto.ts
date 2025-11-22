// src/modules/customers/presentation/dto/address-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AddressType } from '../../domain/value-objects/address-type';

export class AddressResponseDto {
  @ApiProperty({
    example: 'addr-123',
    description: 'Address ID',
  })
  id: string;

  @ApiProperty({
    example: '123 Main Street',
    description: 'Street address line 1',
  })
  street: string;

  @ApiPropertyOptional({
    example: 'Apt 4B',
    description: 'Street address line 2',
  })
  street2?: string;

  @ApiProperty({
    example: 'New York',
    description: 'City',
  })
  city: string;

  @ApiProperty({
    example: 'NY',
    description: 'State/Province',
  })
  state: string;

  @ApiProperty({
    example: '10001',
    description: 'Postal/ZIP code',
  })
  postalCode: string;

  @ApiProperty({
    example: 'US',
    description: 'Country code',
  })
  country: string;

  @ApiProperty({
    enum: AddressType,
    example: AddressType.HOME,
    description: 'Address type',
  })
  type: AddressType;

  @ApiProperty({
    example: true,
    description: 'Whether this is the default address',
  })
  isDefault: boolean;

  @ApiPropertyOptional({
    example: 'Leave at front door',
    description: 'Delivery instructions',
  })
  deliveryInstructions?: string;

  @ApiProperty({
    example: '2025-10-31T10:00:00Z',
    description: 'Address creation date',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2025-10-31T12:30:00Z',
    description: 'Last update date',
  })
  updatedAt: Date;
}
