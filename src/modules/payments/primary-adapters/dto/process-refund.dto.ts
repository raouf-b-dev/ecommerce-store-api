// src/modules/payments/presentation/dto/process-refund.dto.ts
import { IsNumber, IsString, IsOptional, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ProcessRefundDto {
  @ApiProperty({
    example: 9999,
    description: 'Refund amount in minor currency units',
    type: 'integer',
  })
  @IsNumber()
  @Min(1)
  amount!: number;

  @ApiPropertyOptional({
    example: 'User  requested cancellation',
    description: 'Reason for refund',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
