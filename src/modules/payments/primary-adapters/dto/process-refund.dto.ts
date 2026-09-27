// src/modules/payments/presentation/dto/process-refund.dto.ts
import { IsNumber, IsString, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProcessRefundDto {
  @ApiProperty({
    example: 99.99,
    description: 'Refund amount',
  })
  @IsNumber()
  @Min(0.01)
  amount!: number;

  @ApiPropertyOptional({
    example: 'User  requested cancellation',
    description: 'Reason for refund',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
