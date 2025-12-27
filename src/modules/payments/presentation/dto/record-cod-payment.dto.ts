// src/modules/payments/presentation/dto/record-cod-payment.dto.ts
import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RecordCodPaymentDto {
  @ApiProperty({
    example: 123,
    description: 'Order ID',
  })
  @IsNumber()
  orderId: number;

  @ApiProperty({
    example: 299.99,
    description: 'Amount collected',
  })
  @IsNumber()
  @Min(0.01)
  amountCollected: number;

  @ApiProperty({
    example: 'USD',
    description: 'Currency code',
  })
  @IsString()
  currency: string;

  @ApiPropertyOptional({
    example: 'driver-456',
    description: 'Delivery driver ID',
  })
  @IsOptional()
  @IsString()
  collectedBy?: string;

  @ApiPropertyOptional({
    example: 'Collected at customer doorstep',
    description: 'Collection notes',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
