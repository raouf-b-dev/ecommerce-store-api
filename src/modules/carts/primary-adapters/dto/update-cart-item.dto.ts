// src/modules/carts/presentation/dto/update-cart-item.dto.ts
import { IsNumber, IsPositive, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateCartItemDto {
  @ApiProperty({
    example: 3,
    description: 'New quantity for the item',
  })
  @IsNumber()
  @IsPositive()
  @Min(1)
  quantity: number;
}
