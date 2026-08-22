import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../shared-kernel/domain/interfaces/base.usecase';
import { Result } from '../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { OrderRepository } from '../../domain/repositories/order-repository';
import { Order } from '../../domain/entities/order';
import { OrderItemProps } from '../../domain/entities/order-items';
import { OrderStatus } from '../../domain/value-objects/order-status';
import { DEMO_SEED_ORDERS } from './demo-orders';

export interface SeedDemoOrderProductItem {
  id: number;
  sku: string;
  name: string;
  price: number;
}

export interface SeedDemoOrdersInput {
  userId: number;
  products: SeedDemoOrderProductItem[];
}

export interface SeededDemoOrder {
  id: number;
  referenceName: string;
  status: OrderStatus;
  seedStatus: 'created' | 'existing';
}

@Injectable()
export class SeedDemoOrdersUseCase extends UseCase<
  SeedDemoOrdersInput,
  SeededDemoOrder[],
  UseCaseError
> {
  constructor(private readonly orderRepository: OrderRepository) {
    super();
  }

  async execute(
    input: SeedDemoOrdersInput,
  ): Promise<Result<SeededDemoOrder[], UseCaseError>> {
    const existingOrdersResult = await this.orderRepository.listOrders({
      userId: input.userId,
    });

    if (
      existingOrdersResult.isSuccess &&
      existingOrdersResult.value.length > 0
    ) {
      const seeded: SeededDemoOrder[] = existingOrdersResult.value.map(
        (o, idx) => ({
          id: o.id!,
          referenceName:
            DEMO_SEED_ORDERS[idx]?.referenceName ?? `Order #${o.id}`,
          status: o.status,
          seedStatus: 'existing' as const,
        }),
      );
      return Result.success(seeded);
    }

    const productMapBySku = new Map<string, SeedDemoOrderProductItem>();
    for (const p of input.products) {
      if (p.sku) {
        productMapBySku.set(p.sku, p);
      }
    }

    const seededOrders: SeededDemoOrder[] = [];

    for (const seedDef of DEMO_SEED_ORDERS) {
      const orderItems: OrderItemProps[] = [];

      for (const itemDef of seedDef.items) {
        const product = productMapBySku.get(itemDef.sku);
        if (product && product.id) {
          orderItems.push({
            id: null,
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            unitPrice: product.price,
            quantity: itemDef.quantity,
          });
        }
      }

      if (orderItems.length === 0) {
        continue;
      }

      const order = Order.create({
        id: null,
        userId: input.userId,
        paymentMethod: seedDef.paymentMethod,
        items: orderItems,
        shippingAddress: {
          id: null,
          ...seedDef.shippingAddress,
        },
        customerNotes: seedDef.userNotes,
      });

      this.applyStatusTransition(order, seedDef.targetStatus);

      const saveResult = await this.orderRepository.save(order);
      if (saveResult.isFailure) {
        return ErrorFactory.UseCaseError(
          `Failed to seed order '${seedDef.referenceName}'`,
          saveResult.error,
        );
      }

      seededOrders.push({
        id: saveResult.value.id!,
        referenceName: seedDef.referenceName,
        status: saveResult.value.status,
        seedStatus: 'created',
      });
    }

    return Result.success(seededOrders);
  }

  private applyStatusTransition(order: Order, targetStatus: OrderStatus): void {
    if (targetStatus === OrderStatus.PENDING_PAYMENT) {
      return;
    }

    if (
      targetStatus === OrderStatus.CONFIRMED ||
      targetStatus === OrderStatus.PROCESSING ||
      targetStatus === OrderStatus.SHIPPED ||
      targetStatus === OrderStatus.DELIVERED
    ) {
      order.confirmPayment(1);
    }

    if (
      targetStatus === OrderStatus.PROCESSING ||
      targetStatus === OrderStatus.SHIPPED ||
      targetStatus === OrderStatus.DELIVERED
    ) {
      order.process();
    }

    if (
      targetStatus === OrderStatus.SHIPPED ||
      targetStatus === OrderStatus.DELIVERED
    ) {
      order.ship();
    }

    if (targetStatus === OrderStatus.DELIVERED) {
      order.deliver();
    }

    if (targetStatus === OrderStatus.CANCELLED) {
      order.cancel('Seeded cancellation');
    }
  }
}
