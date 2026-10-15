import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../shared-kernel/domain/interfaces/base.usecase';
import { isFailure, Result } from '../../../../../shared-kernel/domain/result';
import { Money } from '../../../../../shared-kernel/domain/value-objects/money';
import { UseCaseError } from '../../../../../shared-kernel/domain/exceptions/usecase.error';
import { OrderRepository } from '../../domain/repositories/order-repository';
import { Order } from '../../domain/entities/order';
import { OrderItemProps } from '../../domain/entities/order-items';
import { OrderStatus } from '../../domain/value-objects/order-status';
import { PaymentMethodType } from '../../../../../shared-kernel/domain/value-objects/payment-method';
import { DEMO_SEED_ORDERS } from './demo-orders';

export interface SeedDemoOrderProductItem {
  id: number;
  sku: string;
  name: string;
  price: number;
  currency: string;
  imageUrl: string | null;
}

export interface SeedDemoOrdersInput {
  userId: number;
  products: SeedDemoOrderProductItem[];
}

export interface SeededDemoOrderLine {
  productId: number;
  quantity: number;
}

export interface SeededDemoOrder {
  id: number;
  referenceName: string;
  status: OrderStatus;
  seedStatus: 'created' | 'existing';
  totalPrice: number;
  currency: string;
  paymentMethod: PaymentMethodType;
  items: SeededDemoOrderLine[];
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
        (o, idx) => this.toSeededSummary(o, idx, 'existing'),
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
          const unitPrice = Money.fromMajorUnits(
            product.price,
            product.currency,
          );
          if (isFailure(unitPrice)) {
            return unitPrice;
          }
          orderItems.push({
            id: null,
            productId: product.id,
            productName: product.name,
            sku: product.sku,
            imageUrl: product.imageUrl,
            unitPrice: unitPrice.value.amount,
            quantity: itemDef.quantity,
            currency: unitPrice.value.currency,
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
      if (isFailure(saveResult)) {
        return saveResult;
      }

      seededOrders.push(
        this.toSeededSummary(
          saveResult.value,
          seededOrders.length,
          'created',
          seedDef.referenceName,
        ),
      );
    }

    return Result.success(seededOrders);
  }

  private toSeededSummary(
    order: Order,
    index: number,
    seedStatus: 'created' | 'existing',
    referenceName?: string,
  ): SeededDemoOrder {
    const primitives = order.toPrimitives();
    return {
      id: order.id!,
      referenceName:
        referenceName ??
        DEMO_SEED_ORDERS[index]?.referenceName ??
        `Order #${order.id}`,
      status: order.status,
      seedStatus,
      totalPrice: primitives.totalPrice,
      currency: primitives.currency,
      paymentMethod: primitives.paymentMethod,
      items: order.getItems().map((item) => ({
        productId: item.productId,
        quantity: item.quantity,
      })),
    };
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
