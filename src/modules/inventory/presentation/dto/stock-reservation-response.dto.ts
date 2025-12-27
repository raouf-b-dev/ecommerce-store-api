// src/modules/inventory/presentation/dto/stock-reservation-response.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class StockReservationResponseDto {
  @ApiProperty({
    example: 'res-123',
    description: 'Reservation ID',
  })
  reservationId: number;

  @ApiProperty({
    example: 'order-123',
    description: 'Order ID',
  })
  orderId: number;

  @ApiProperty({
    example: '2025-10-31T12:30:00Z',
    description: 'Reservation expiry date',
  })
  expiresAt: Date;

  @ApiProperty({
    example: true,
    description: 'Whether reservation was successful',
  })
  success: boolean;
}
