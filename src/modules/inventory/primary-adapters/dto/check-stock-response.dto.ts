import { ApiProperty } from '@nestjs/swagger';

export class CheckStockResponseDto {
  @ApiProperty({ type: Boolean, example: true })
  isAvailable!: boolean;

  @ApiProperty({ type: Number, example: 25 })
  availableQuantity!: number;

  @ApiProperty({ type: Number, example: 1 })
  requestedQuantity!: number;
}
