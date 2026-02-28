// src/modules/customers/presentation/dto/create-customer.dto.ts
import { IsString, IsEmail, IsOptional, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { AddAddressDto } from './add-address.dto';

export class CreateCustomerDto {
  @ApiProperty({
    example: 'John',
    description: 'Customer first name',
  })
  @IsString()
  firstName: string;

  @ApiProperty({
    example: 'Doe',
    description: 'Customer last name',
  })
  @IsString()
  lastName: string;

  @ApiProperty({
    example: 'john.doe@example.com',
    description: 'Customer email',
  })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({
    example: '+1234567890',
    description: 'Customer phone number',
  })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({
    type: AddAddressDto,
    description: 'Initial address (optional)',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => AddAddressDto)
  address?: AddAddressDto;
}
