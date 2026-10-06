// src/modules/payments/presentation/dto/record-cod-payment.dto.ts
import { IsString, IsNumber, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RecordCodPaymentDto {
  @ApiProperty({
    example: 123,
    description: 'Order ID',
  })
  @IsNumber()
  orderId!: number;

  @ApiProperty({
    example: 29999,
    description: 'Amount collected in minor currency units',
    type: 'integer',
  })
  @IsNumber()
  @Min(1)
  amountCollected!: number;

  @ApiProperty({
    example: 'USD',
    description: 'Currency code',
  })
  @IsString()
  currency!: string;

  @ApiPropertyOptional({
    example: 'driver-456',
    description: 'Delivery driver ID',
  })
  @IsOptional()
  @IsString()
  collectedBy?: string;

  @ApiPropertyOptional({
    example: 'Collected at user doorstep',
    description: 'Collection notes',
  })
  @IsOptional()
  @IsString()
  notes?: string;
}
