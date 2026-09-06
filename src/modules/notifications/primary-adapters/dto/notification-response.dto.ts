import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class NotificationResponseDto {
  @ApiProperty({ type: String, example: 'notif_abc123' })
  id!: string;

  @ApiPropertyOptional({ type: String, nullable: true, example: '42' })
  userId!: string | null;

  @ApiPropertyOptional({ type: String, nullable: true, example: 'ADMIN' })
  targetRole!: string | null;

  @ApiProperty({ type: String, example: 'order.created' })
  type!: string;

  @ApiProperty({ type: String, example: 'New order received' })
  title!: string;

  @ApiProperty({ type: String, example: 'Order #42 was placed.' })
  message!: string;

  @ApiPropertyOptional({
    type: 'object',
    additionalProperties: true,
    nullable: true,
  })
  payload?: Record<string, unknown> | null;

  @ApiProperty({ type: String, example: 'unread' })
  status!: string;

  @ApiPropertyOptional({
    type: String,
    nullable: true,
    example: 'Gateway timeout',
  })
  failedReason?: string | null;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    nullable: true,
    example: '2025-10-31T12:35:00.000Z',
  })
  deliveredAt?: string | null;

  @ApiPropertyOptional({
    type: String,
    format: 'date-time',
    nullable: true,
    example: '2025-11-30T12:30:00.000Z',
  })
  expiresAt?: string | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    example: '2025-10-31T12:30:00.000Z',
  })
  createdAt!: string;
}

export class UserNotificationsResponseDto {
  @ApiProperty({ type: [NotificationResponseDto] })
  data!: NotificationResponseDto[];

  @ApiProperty({ type: Number, example: 25 })
  total!: number;

  @ApiProperty({ type: Number, example: 3 })
  unread!: number;
}
