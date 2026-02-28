// src/modules/orders/presentation/dto/deliver-order.dto.ts
import { ApiProperty } from '@nestjs/swagger';

export class DeliverOrderDto {
  @ApiProperty({ required: false })
  codPayment?: {
    transactionId?: string;
    notes?: string;
    collectedBy?: string;
  };
}
