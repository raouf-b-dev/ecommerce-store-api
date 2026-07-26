// src/modules/users/presentation/dto/user-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { AddressResponseDto } from 'src/modules/identity/primary-adapters/dto/address-response.dto';

export class UserResponseDto {
  @ApiProperty({
    example: 123,
    description: 'User ID',
  })
  id: number;

  @ApiProperty({
    example: 'John',
    description: 'User first name',
  })
  firstName: string;

  @ApiProperty({
    example: 'Doe',
    description: 'User last name',
  })
  lastName: string;

  @ApiProperty({
    example: 'John Doe',
    description: 'User full name',
  })
  fullName: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'User email',
  })
  email: string;

  @ApiPropertyOptional({
    example: '+1234567890',
    description: 'User phone number',
  })
  phone?: string;

  @ApiProperty({
    type: [AddressResponseDto],
    description: 'User addresses',
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
    description: 'User registration date',
  })
  createdAt: Date;

  @ApiProperty({
    example: '2025-10-31T12:30:00Z',
    description: 'Last update date',
  })
  updatedAt: Date;
}
