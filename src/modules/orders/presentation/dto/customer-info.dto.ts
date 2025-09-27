// src/modules/orders/presentation/dto/customer-info.dto.ts
import { IsString, IsEmail, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CustomerInfoDto {
  @ApiProperty({
    example: 'customer@example.com',
    description: 'Customer email address',
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

  @ApiProperty({ example: 'John', description: 'Customer first name' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Doe', description: 'Customer last name' })
  @IsString()
  lastName: string;
}
