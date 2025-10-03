// src/modules/orders/domain/factories/order.factory.ts
import { Injectable } from '@nestjs/common';
import { CreateOrderDto } from '../../presentation/dto/create-order.dto';
import { UpdateOrderDto } from '../../presentation/dto/update-order.dto';
import { CreateOrderItemDto } from '../../presentation/dto/create-order-item.dto';
import { DomainError } from '../../../../core/errors/domain.error';
import { OrderStatus, OrderStatusVO } from '../value-objects/order-status';
import { PaymentStatus } from '../value-objects/payment-status';
import { OrderItemProps } from '../entities/order-items';
import { Order } from '../entities/order';

export interface AggregatedOrderInput extends Omit<CreateOrderDto, 'items'> {
  items: CreateOrderItemDto[];
}
export interface AggregatedUpdateInput extends Omit<UpdateOrderDto, 'items'> {
  items?: CreateOrderItemDto[];
}

export interface OrderCreationProps {
  orderId: string;
  customerId: string;
  paymentInfoId: string;
  shippingAddressId: string;
  orderDto: CreateOrderDto;
  domainOrderItems: OrderItemProps[];
}

export interface OrderPricing {
  subtotal: number;
  shippingCost: number;
  totalPrice: number;
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

  calculatePricing(items: OrderItemProps[]): OrderPricing {
    const subtotal = items.reduce((total, item) => {
      return total + item.unitPrice * item.quantity;
    }, 0);

    const baseShippingRate = 5.99;
    const freeShippingThreshold = 50;
    const shippingCost =
      subtotal >= freeShippingThreshold ? 0 : baseShippingRate;

    const totalPrice = subtotal + shippingCost;

    return {
      subtotal,
      shippingCost,
      totalPrice,
    };
  }

  createOrderWithCalculatedPricing(props: OrderCreationProps): Order {
    const {
      orderId,
      customerId,
      paymentInfoId,
      shippingAddressId,
      orderDto,
      domainOrderItems,
    } = props;

    const pricing = this.calculatePricing(domainOrderItems);

    const paymentInfoWithId = {
      id: paymentInfoId,
      method: orderDto.paymentInfo.method,
      status: PaymentStatus.PENDING,
      amount: pricing.totalPrice,
      transactionId: undefined,
      paidAt: undefined,
      notes: orderDto.paymentInfo.notes,
    };

    const shippingAddressWithId = {
      id: shippingAddressId,
      ...orderDto.shippingAddress,
    };

    const customerInfoWithId = {
      customerId: customerId,
      ...orderDto.customerInfo,
    };

    const domainOrder = Order.create({
      id: orderId,
      customerId: customerId,
      customerInfo: customerInfoWithId,
      items: domainOrderItems,
      shippingAddress: shippingAddressWithId,
      paymentInfo: paymentInfoWithId,
      customerNotes: orderDto.customerNotes,
    });

    return domainOrder;
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
    if (orderStatus) {
      const status = new OrderStatusVO(orderStatus);
      if (!status.isPending()) {
        return new DomainError(
          'Only orders with status PENDING can be updated.',
        );
      }
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

  validatePricingConsistency(
    items: OrderItemProps[],
    expectedTotal: number,
    tolerance: number = 0.01,
  ): boolean {
    const calculatedPricing = this.calculatePricing(items);
    const difference = Math.abs(calculatedPricing.totalPrice - expectedTotal);
    return difference <= tolerance;
  }

  recalculatePricingForUpdate(
    items: OrderItemProps[],
    existingPaymentInfo: any,
  ): any {
    const pricing = this.calculatePricing(items);

    return {
      ...existingPaymentInfo,
      amount: pricing.totalPrice,
    };
  }
}
