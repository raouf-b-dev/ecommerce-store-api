// src/modules/orders/domain/factories/order.factory.ts
import { Injectable } from '@nestjs/common';
import { CreateOrderDto } from '../../presentation/dto/create-order.dto';
import { UpdateOrderDto } from '../../presentation/dto/update-order.dto';
import { CreateOrderItemDto } from '../../presentation/dto/create-order-item.dto';

export interface AggregatedOrderInput extends Omit<CreateOrderDto, 'items'> {
  items: CreateOrderItemDto[];
  totalPrice: number;
}
export interface AggregatedUpdateInput extends Omit<UpdateOrderDto, 'items'> {
  items?: CreateOrderItemDto[];
  totalPrice?: number;
}

@Injectable()
export class OrderFactory {
  private aggregateItems(items: CreateOrderItemDto[]): CreateOrderItemDto[] {
    const map = new Map<string, CreateOrderItemDto>();
    for (const item of items) {
      const existing = map.get(item.productId);
      if (existing) {
        existing.quantity += item.quantity;
        existing.lineTotal = Number(
          (existing.quantity * existing.unitPrice).toFixed(2),
        );
      } else {
        const cloned: CreateOrderItemDto = {
          ...item,
          lineTotal: Number((item.unitPrice * item.quantity).toFixed(2)),
        } as any;
        map.set(item.productId, cloned);
      }
    }
    return Array.from(map.values());
  }

  createFromDto(dto: CreateOrderDto): AggregatedOrderInput {
    const aggregatedItems = this.aggregateItems(dto.items || []);
    if (aggregatedItems.length === 0) {
      throw new Error('Order must have at least one item.');
    }

    const totalPrice = Number(
      aggregatedItems
        .reduce(
          (sum, it) => sum + (it.lineTotal ?? it.unitPrice * it.quantity),
          0,
        )
        .toFixed(2),
    );

    return {
      ...dto,
      items: aggregatedItems,
      totalPrice,
    };
  }

  updateFromDto(dto: UpdateOrderDto): AggregatedUpdateInput {
    if (!dto.items) {
      return { ...dto };
    }

    const aggregatedItems = this.aggregateItems(dto.items);
    const totalPrice = Number(
      aggregatedItems
        .reduce(
          (sum, it) => sum + (it.lineTotal ?? it.unitPrice * it.quantity),
          0,
        )
        .toFixed(2),
    );

    return {
      ...dto,
      items: aggregatedItems,
      totalPrice,
    };
  }
}
