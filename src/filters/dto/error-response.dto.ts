import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ErrorCode } from '../../shared-kernel/domain/exceptions/error-code';

/**
 * Wire shape produced by GlobalExceptionFilter for failed HTTP responses.
 *
 * `code` stays an OpenAPI string (not a closed enum): the filter emits
 * ErrorCode values and other SCREAMING codes (MUST_CHANGE_PASSWORD,
 * PAYLOAD_TOO_LARGE, status-derived names, and similar).
 */
export class ErrorResponseDto {
  @ApiProperty({ example: false })
  success!: false;

  @ApiProperty({ example: 404 })
  statusCode!: number;

  @ApiProperty({ example: 'Order with id 42 not found' })
  message!: string;

  @ApiProperty({
    type: String,
    description:
      'Stable machine-readable code. Common values include "ORDER_NOT_FOUND", "PAYMENT_NOT_FOUND", "UNAUTHORIZED", "FORBIDDEN". Not exhaustive: other SCREAMING_CASE codes also appear (for example MUST_CHANGE_PASSWORD, PAYLOAD_TOO_LARGE, METHOD_NOT_ALLOWED).',
    example: ErrorCode.ORDER_NOT_FOUND,
  })
  code!: string;

  @ApiProperty({ example: '2026-11-01T12:00:00.000Z' })
  timestamp!: string;

  @ApiPropertyOptional({
    type: [String],
    description: 'Validation detail messages when present',
  })
  errors?: string[];
}
