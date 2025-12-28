import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '../../domain/value-objects/order-status';

export class CheckoutResponseDto {
  @ApiProperty({
    example: 123,
    description: 'The ID of the order being created',
  })
  orderId: number;

  @ApiProperty({
    example: 'job-123',
    description: 'The ID of the background checkout job',
  })
  jobId: string;

  @ApiProperty({
    example: 'pending_payment',
    description: 'The initial status of the order',
    enum: OrderStatus,
  })
  status: string;

  @ApiProperty({
    example:
      'Checkout process started. Please check order status for payment details.',
    description: 'Result message',
  })
  message: string;

  @ApiProperty({
    example: 'pi_1234567890',
    description:
      'The client secret for payment confirmation (if available immediately)',
    required: false,
  })
  clientSecret?: string;
}
