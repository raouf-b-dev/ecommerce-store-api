import { CreateFromEntity } from '../../../../../infrastructure/mappers/utils/create-from-entity.type';
import { Payment } from '../../../core/domain/entities/payment';
import { IPayment } from '../../../core/domain/interfaces/payment.interface';
import { PaymentEntity } from '../../orm/payment.schema';
import { RefundMapper } from './refund.mapper';
import { decimalFromMinorUnits } from '../../../../../shared-kernel/domain/value-objects/money-decimal';
import { requireMinorUnits } from '../../../../../infrastructure/mappers/utils/decimal-money.util';

type PaymentCreate = CreateFromEntity<PaymentEntity, 'refunds'>;

export type PaymentForCache = Omit<
  IPayment,
  'createdAt' | 'updatedAt' | 'completedAt' | 'refunds'
> & {
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
  refunds: Array<
    Omit<IPayment['refunds'][number], 'createdAt' | 'updatedAt'> & {
      createdAt: number;
      updatedAt: number;
    }
  >;
};

export class PaymentMapper {
  static toDomain(entity: PaymentEntity): Payment {
    const data: IPayment = {
      id: entity.id,
      orderId: entity.orderId,
      userId: entity.userId,
      amount: requireMinorUnits(entity.amount),
      currency: entity.currency,
      paymentMethod: entity.paymentMethod,
      provider: entity.provider,
      status: entity.status,
      transactionId: entity.transactionId,
      gatewayPaymentIntentId: entity.gatewayPaymentIntentId || null,
      gatewayClientSecret: entity.gatewayClientSecret || null,
      paymentMethodInfo: entity.paymentMethodInfo,
      refundedAmount: requireMinorUnits(entity.refundedAmount),
      refunds: entity.refunds
        ? entity.refunds.map((r) => RefundMapper.toDomain(r).toPrimitives())
        : [],
      failureReason: entity.failureReason,
      createdAt: entity.createdAt,
      completedAt: entity.completedAt,
      updatedAt: entity.updatedAt,
    };

    return Payment.fromPrimitives(data);
  }

  static toEntity(domain: Payment): PaymentEntity {
    const primitives = domain.toPrimitives();

    const paymentPayload: PaymentCreate = {
      id: primitives.id || 0,
      orderId: primitives.orderId,
      userId: primitives.userId,
      amount: Number(decimalFromMinorUnits(primitives.amount)),
      currency: primitives.currency,
      paymentMethod: primitives.paymentMethod,
      provider: primitives.provider,
      status: primitives.status,
      transactionId: primitives.transactionId,
      gatewayPaymentIntentId: primitives.gatewayPaymentIntentId,
      gatewayClientSecret: primitives.gatewayClientSecret,
      paymentMethodInfo: primitives.paymentMethodInfo,
      refundedAmount: Number(decimalFromMinorUnits(primitives.refundedAmount)),
      failureReason: primitives.failureReason,
      createdAt: primitives.createdAt,
      completedAt: primitives.completedAt,
      updatedAt: primitives.updatedAt,
    };

    const entity: PaymentEntity = Object.assign(
      new PaymentEntity(),
      paymentPayload,
    );

    entity.refunds = RefundMapper.toEntityArray(domain.refunds);

    return entity;
  }
}

export class PaymentCacheMapper {
  static toCache(domain: Payment): PaymentForCache {
    const primitives = domain.toPrimitives();
    return {
      ...primitives,
      createdAt: primitives.createdAt.getTime(),
      updatedAt: primitives.updatedAt.getTime(),
      completedAt: primitives.completedAt
        ? primitives.completedAt.getTime()
        : null,
      refunds: primitives.refunds.map((refund) => ({
        ...refund,
        createdAt: refund.createdAt.getTime(),
        updatedAt: refund.updatedAt.getTime(),
      })),
    };
  }

  static fromCache(cached: PaymentForCache): Payment | null {
    try {
      return Payment.fromPrimitives({
        ...cached,
        createdAt: new Date(cached.createdAt),
        updatedAt: new Date(cached.updatedAt),
        completedAt:
          cached.completedAt == null ? null : new Date(cached.completedAt),
        refunds: cached.refunds.map((refund) => ({
          ...refund,
          createdAt: new Date(refund.createdAt),
          updatedAt: new Date(refund.updatedAt),
        })),
      });
    } catch {
      return null;
    }
  }
}
