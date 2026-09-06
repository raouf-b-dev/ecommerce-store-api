import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../shared-kernel/domain/interfaces/base.usecase';
import { Result } from '../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { PaymentMethodType } from '../../../../../shared-kernel/domain/value-objects/payment-method';
import { Payment } from '../../domain/entities/payment';
import { Refund } from '../../domain/entities/refund';
import { PaymentRepository } from '../../domain/repositories/payment.repository';
import { PaymentStatusType } from '../../domain/value-objects/payment-status';
import { RefundStatusType } from '../../domain/value-objects/refund-status';

export interface SeedDemoPaymentItemInput {
  orderId: number;
  userId: number | null;
  amount: number;
  currency: string;
  paymentMethod: PaymentMethodType;
  createdAt: Date;
  withPartialRefundAmount?: number;
}

export interface SeededDemoPayment {
  orderId: number;
  paymentId: number;
  seedStatus: 'created' | 'updated';
}

@Injectable()
export class SeedDemoPaymentsUseCase extends UseCase<
  SeedDemoPaymentItemInput[],
  SeededDemoPayment[],
  UseCaseError
> {
  constructor(private readonly paymentRepository: PaymentRepository) {
    super();
  }

  async execute(
    items: SeedDemoPaymentItemInput[],
  ): Promise<Result<SeededDemoPayment[], UseCaseError>> {
    const seeded: SeededDemoPayment[] = [];

    for (const item of items) {
      const existingResult = await this.paymentRepository.findByOrderId(
        item.orderId,
      );
      if (existingResult.isFailure) {
        return ErrorFactory.UseCaseError(
          `Failed to look up payments for order ${item.orderId}`,
          existingResult.error,
        );
      }

      const existing = existingResult.value[0];
      if (existing) {
        const refreshed = await this.refreshExistingPayment(existing, item);
        if (refreshed.isFailure) {
          return refreshed;
        }
        seeded.push({
          orderId: item.orderId,
          paymentId: refreshed.value,
          seedStatus: 'updated',
        });
        continue;
      }

      const created = await this.createPayment(item);
      if (created.isFailure) {
        return created;
      }
      seeded.push({
        orderId: item.orderId,
        paymentId: created.value,
        seedStatus: 'created',
      });
    }

    return Result.success(seeded);
  }

  private async createPayment(
    item: SeedDemoPaymentItemInput,
  ): Promise<Result<number, UseCaseError>> {
    const payment = Payment.fromPrimitives({
      id: null,
      orderId: item.orderId,
      userId: item.userId,
      amount: item.amount,
      currency: item.currency,
      paymentMethod: item.paymentMethod,
      status: PaymentStatusType.CAPTURED,
      transactionId: `seed_tx_order_${item.orderId}`,
      gatewayPaymentIntentId: `seed_pi_order_${item.orderId}`,
      gatewayClientSecret: null,
      paymentMethodInfo: 'Seeded demo card',
      refundedAmount: 0,
      refunds: [],
      failureReason: null,
      createdAt: item.createdAt,
      completedAt: item.createdAt,
      updatedAt: item.createdAt,
    });

    const saveResult = await this.paymentRepository.save(payment);
    if (saveResult.isFailure) {
      return ErrorFactory.UseCaseError(
        `Failed to seed payment for order ${item.orderId}`,
        saveResult.error,
      );
    }

    const saved = saveResult.value;
    if (item.withPartialRefundAmount && item.withPartialRefundAmount > 0) {
      const withRefund = await this.applyPartialRefund(
        saved,
        item.withPartialRefundAmount,
        item.createdAt,
      );
      if (withRefund.isFailure) {
        return withRefund;
      }
      return Result.success(withRefund.value);
    }

    return Result.success(saved.id!);
  }

  private async refreshExistingPayment(
    existing: Payment,
    item: SeedDemoPaymentItemInput,
  ): Promise<Result<number, UseCaseError>> {
    const primitives = existing.toPrimitives();
    let refunds = primitives.refunds;
    let refundedAmount = primitives.refundedAmount;
    let status = primitives.status;

    if (
      item.withPartialRefundAmount &&
      item.withPartialRefundAmount > 0 &&
      refunds.length === 0
    ) {
      refunds = [
        {
          id: null,
          paymentId: existing.id!,
          amount: item.withPartialRefundAmount,
          currency: item.currency,
          reason: 'Seeded partial refund (demo)',
          status: RefundStatusType.COMPLETED,
          createdAt: item.createdAt,
          updatedAt: item.createdAt,
        },
      ];
      refundedAmount = item.withPartialRefundAmount;
      status = PaymentStatusType.PARTIALLY_REFUNDED;
    } else if (refunds.length > 0) {
      refunds = refunds.map((r) => ({
        ...r,
        createdAt: item.createdAt,
        updatedAt: item.createdAt,
      }));
    }

    const refreshed = Payment.fromPrimitives({
      ...primitives,
      amount: item.amount,
      currency: item.currency,
      status,
      refundedAmount,
      refunds,
      createdAt: item.createdAt,
      completedAt: item.createdAt,
      updatedAt: item.createdAt,
    });

    const updateResult = await this.paymentRepository.update(refreshed);
    if (updateResult.isFailure) {
      return ErrorFactory.UseCaseError(
        `Failed to refresh payment for order ${item.orderId}`,
        updateResult.error,
      );
    }

    return Result.success(updateResult.value.id!);
  }

  private async applyPartialRefund(
    payment: Payment,
    amount: number,
    at: Date,
  ): Promise<Result<number, UseCaseError>> {
    const refund = Refund.fromPrimitives({
      id: null,
      paymentId: payment.id!,
      amount,
      currency: payment.currency,
      reason: 'Seeded partial refund (demo)',
      status: RefundStatusType.COMPLETED,
      createdAt: at,
      updatedAt: at,
    });

    const addResult = payment.addRefund(refund);
    if (addResult.isFailure) {
      return ErrorFactory.UseCaseError(
        `Failed to add seeded refund for payment ${payment.id}`,
        addResult.error,
      );
    }

    // Keep event time aligned with seed `createdAt` after domain mutates updatedAt.
    const aligned = Payment.fromPrimitives({
      ...payment.toPrimitives(),
      createdAt: at,
      completedAt: at,
      updatedAt: at,
      refunds: payment.toPrimitives().refunds.map((r) => ({
        ...r,
        createdAt: at,
        updatedAt: at,
      })),
    });

    const updateResult = await this.paymentRepository.update(aligned);
    if (updateResult.isFailure) {
      return ErrorFactory.UseCaseError(
        `Failed to persist seeded refund for payment ${payment.id}`,
        updateResult.error,
      );
    }

    return Result.success(updateResult.value.id!);
  }
}
