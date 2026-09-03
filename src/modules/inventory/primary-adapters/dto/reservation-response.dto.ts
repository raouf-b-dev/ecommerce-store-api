import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ReservationStatus } from '../../core/domain/value-objects/reservation-status';

export class ReservationItemResponseDto {
  @ApiPropertyOptional({ type: Number, nullable: true, example: 1 })
  id!: number | null;

  @ApiProperty({ type: Number, example: 10 })
  productId!: number;

  @ApiProperty({ type: Number, example: 2 })
  quantity!: number;
}

export class ReservationResponseDto {
  @ApiPropertyOptional({ type: Number, nullable: true, example: 1 })
  id!: number | null;

  @ApiProperty({ type: Number, example: 42 })
  orderId!: number;

  @ApiProperty({ type: [ReservationItemResponseDto] })
  items!: ReservationItemResponseDto[];

  @ApiProperty({ enum: ReservationStatus, example: ReservationStatus.PENDING })
  status!: ReservationStatus;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2025-10-31T13:00:00.000Z',
  })
  expiresAt!: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2025-10-31T12:30:00.000Z',
  })
  createdAt!: string;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2025-10-31T12:30:00.000Z',
  })
  updatedAt!: string;
}
