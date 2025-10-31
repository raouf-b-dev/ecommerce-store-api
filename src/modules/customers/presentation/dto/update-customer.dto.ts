// src/modules/customers/presentation/dto/update-customer.dto.ts
import { IsString, IsEmail, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateCustomerDto {
  @ApiPropertyOptional({
    example: 'John',
    description: 'Customer first name',
  })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional({
    example: 'Doe',
    description: 'Customer last name',
  })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional({
    example: 'john.doe@example.com',
    description: 'Customer email',
  })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({
    example: '+1234567890',
    description: 'Customer phone number',
  })
  @IsOptional()
  @IsString()
  phone?: string;
}
