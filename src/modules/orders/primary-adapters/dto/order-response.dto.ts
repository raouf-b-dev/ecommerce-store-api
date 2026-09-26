// Copyright (c) 2025-2026 Abderaouf Bouzerara
// SPDX-License-Identifier: AGPL-3.0-only

import { ApiProperty } from '@nestjs/swagger';
import { OrderItemResponseDto } from './order-item-response.dto';
import { OrderStatus } from '../../core/domain/value-objects/order-status';

export class OrderResponseDto {
  @ApiProperty({ example: 'ord_123' })
  id!: string;

  @ApiProperty({ example: 'cust_456' })
  userId!: string;

  @ApiProperty({ type: [OrderItemResponseDto] })
  items!: OrderItemResponseDto[];

  @ApiProperty({ enum: OrderStatus })
  status!: OrderStatus;

  @ApiProperty({ example: 2400 })
  totalPrice!: number;

  @ApiProperty({ example: '2025-08-25T12:34:56.000Z' })
  createdAt!: Date;

  @ApiProperty({ example: '2025-08-25T12:34:56.000Z' })
  updatedAt!: Date;
}
