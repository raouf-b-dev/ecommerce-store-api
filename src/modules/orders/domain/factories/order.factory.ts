// src/modules/orders/domain/factories/order.factory.ts
import { Injectable } from '@nestjs/common';
import { CreateOrderDto } from '../../presentation/dto/create-order.dto';
import { UpdateOrderDto } from '../../presentation/dto/update-order.dto';
import { CreateOrderItemDto } from '../../presentation/dto/create-order-item.dto';
import { DomainError } from '../../../../core/errors/domain.error';
import { OrderStatus, OrderStatusVO } from '../value-objects/order-status';
import { Order } from '../entities/order';
import { ICart } from '../../../carts/domain/interfaces/cart.interface';
import { PaymentMethodType } from '../../../payments/domain';
import { ShippingAddressProps } from '../value-objects/shipping-address';
import { OrderItemProps } from '../entities/order-items';

export interface AggregatedOrderInput extends Omit<CreateOrderDto, 'items'> {
  items: CreateOrderItemDto[];
}

export interface AggregatedUpdateInput extends Omit<UpdateOrderDto, 'items'> {
  items?: CreateOrderItemDto[];
}

@Injectable()
export class OrderFactory {
  createFromCart(props: {
    cart: ICart;
    userId: number;
    shippingAddress: ShippingAddressProps;
    paymentMethod: PaymentMethodType;
    customerNotes?: string;
    orderId?: number | null;
  }): Order {
    const items = props.cart.items.map((item) => {
      const prop: OrderItemProps = {
        id: 0,
        productId: item.productId,
        productName: item.productName,
        unitPrice: item.price,
        quantity: item.quantity,
      };
      return prop;
    });

    const id = props.orderId || null;
    return Order.create({
      id,
      customerId: props.userId,
      paymentMethod: props.paymentMethod,
      items,
      shippingAddress: props.shippingAddress,
      customerNotes: props.customerNotes || null,
    });
  }

  private aggregateItems(items: CreateOrderItemDto[]): CreateOrderItemDto[] {
    const map = new Map<number, CreateOrderItemDto>();

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

  updateFromDto(
    dto: UpdateOrderDto,
    orderStatus: OrderStatus,
  ): AggregatedUpdateInput | DomainError {
    const status = new OrderStatusVO(orderStatus);

    if (!status.isAwaitingPayment()) {
      return new DomainError('Only orders awaiting payment can be updated.');
    }

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
