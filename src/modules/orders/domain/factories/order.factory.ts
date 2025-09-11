// src/modules/orders/domain/factories/order.factory.ts
import { Injectable } from '@nestjs/common';
import { CreateOrderDto } from '../../presentation/dto/create-order.dto';
import { UpdateOrderDto } from '../../presentation/dto/update-order.dto';
import { CreateOrderItemDto } from '../../presentation/dto/create-order-item.dto';

export interface AggregatedOrderInput extends Omit<CreateOrderDto, 'items'> {
  items: CreateOrderItemDto[]; // no totalPrice here
}
export interface AggregatedUpdateInput extends Omit<UpdateOrderDto, 'items'> {
  items?: CreateOrderItemDto[];
}

@Injectable()
export class OrderFactory {
  private aggregateItems(items: CreateOrderItemDto[]): CreateOrderItemDto[] {
    const map = new Map<string, CreateOrderItemDto>();
    for (const item of items || []) {
      const existing = map.get(item.productId);
      if (existing) {
        existing.quantity += item.quantity;
      } else {
        map.set(item.productId, { ...item });
      }
    }
    return Array.from(map.values());
  }

  createFromDto(dto: CreateOrderDto): AggregatedOrderInput {
    const aggregatedItems = this.aggregateItems(dto.items || []);
    if (aggregatedItems.length === 0) {
      throw new Error('Order must have at least one item.');
    }

    return {
      ...dto,
      items: aggregatedItems,
    };
  }

  updateFromDto(dto: UpdateOrderDto): AggregatedUpdateInput {
    if (!dto.items) {
      return { ...dto };
    }

    const aggregatedItems = this.aggregateItems(dto.items);
    return {
      ...dto,
      items: aggregatedItems,
    };
  }
}
