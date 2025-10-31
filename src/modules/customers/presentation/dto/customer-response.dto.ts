// src/modules/customers/presentation/dto/customer-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AddressResponseDto } from './address-response.dto';

export class CustomerResponseDto {
  @ApiProperty({
    example: 'cust-123',
    description: 'Customer ID',
  })
  id: string;

  @ApiProperty({
    example: 'John',
    description: 'Customer first name',
  })
  firstName: string;

  @ApiProperty({
    example: 'Doe',
    description: 'Customer last name',
  })
  lastName: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'Customer full name',
  })
  fullName: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Customer email',
  })
  email: string;

  @ApiPropertyOptional({
    example: '+1234567890',
    description: 'Customer phone number',
  })
  phone?: string;

  @ApiProperty({
    type: [AddressResponseDto],
    description: 'Customer addresses',
  })
  @Type(() => AddressResponseDto)
  addresses: AddressResponseDto[];

  @ApiPropertyOptional({
    type: AddressResponseDto,
    description: 'Default address',
  })
  @Type(() => AddressResponseDto)
  defaultAddress?: AddressResponseDto;

  @ApiProperty({
    example: 5,
    description: 'Total number of orders',
  })
  totalOrders: number;

  @ApiProperty({
    example: 1499.95,
    description: 'Total amount spent',
  })
  totalSpent: number;

  @ApiProperty({
    example: '2025-10-31T10:00:00Z',
    description: 'Customer registration date',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2025-10-31T12:30:00Z',
    description: 'Last update date',
  })
  updatedAt: Date;
}
