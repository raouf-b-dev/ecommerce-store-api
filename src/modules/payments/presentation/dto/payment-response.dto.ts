// src/modules/payments/presentation/dto/payment-response.dto.ts
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethodType } from '../../domain/value-objects/payment-method';
import { PaymentStatusType } from '../../domain/value-objects/payment-status';

export class PaymentResponseDto {
  @ApiProperty({
    example: 'pay-123',
    description: 'Payment ID',
  })
  id: string;

  @ApiProperty({
    example: 'order-123',
    description: 'Order ID',
  })
  orderId: string;

  @ApiProperty({
    example: 299.99,
    description: 'Payment amount',
  })
  amount: number;

  @ApiProperty({
    example: 'USD',
    description: 'Currency code',
  })
  currency: string;

  @ApiProperty({
    enum: PaymentMethodType,
    example: PaymentMethodType.CREDIT_CARD,
    description: 'Payment method',
  })
  paymentMethod: PaymentMethodType;

  @ApiProperty({
    enum: PaymentStatusType,
    example: PaymentStatusType.COMPLETED,
    description: 'Payment status',
  })
  status: PaymentStatusType;

  @ApiPropertyOptional({
    example: 'txn_1234567890',
    description: 'Transaction ID from payment gateway',
  })
  transactionId?: string;

  @ApiPropertyOptional({
    example: 'user-123',
    description: 'Customer ID',
  })
  customerId?: string;

  @ApiPropertyOptional({
    example: '**** 1234',
    description: 'Masked payment method info',
  })
  paymentMethodInfo?: string;

  @ApiPropertyOptional({
    example: 50.0,
    description: 'Refunded amount',
  })
  refundedAmount?: number;

  @ApiPropertyOptional({
    example: 'Payment gateway error',
    description: 'Failure reason if payment failed',
  })
  failureReason?: string;

  @ApiProperty({
    example: '2025-10-31T10:00:00Z',
    description: 'Payment creation date',
  })
  createdAt: Date;

  @ApiPropertyOptional({
    example: '2025-10-31T10:05:00Z',
    description: 'Payment completion date',
  })
  completedAt?: Date;

  @ApiProperty({
    example: '2025-10-31T12:30:00Z',
    description: 'Last update date',
  })
  updatedAt: Date;
}
