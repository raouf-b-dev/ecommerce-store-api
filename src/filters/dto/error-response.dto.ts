import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/** Wire shape produced by GlobalExceptionFilter for failed HTTP responses. */
export class ErrorResponseDto {
  @ApiProperty({ example: false })
  success!: false;

  @ApiProperty({ example: 404 })
  statusCode!: number;

  @ApiProperty({ example: 'Order with id 42 not found' })
  message!: string;

  @ApiProperty({ example: 'ORDER_NOT_FOUND' })
  code!: string;

  @ApiProperty({ example: '2026-11-01T12:00:00.000Z' })
  timestamp!: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Validation detail messages when present',
  })
  errors?: string[];
}
