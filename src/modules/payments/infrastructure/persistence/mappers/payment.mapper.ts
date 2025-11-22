import { CreateFromEntity } from '../../../../../shared/infrastructure/mappers/utils/create-from-entity.type';
import { Payment, PaymentProps } from '../../../domain/entities/payment';
import { IPayment } from '../../../domain/interfaces/payment.interface';
import { PaymentMethodType } from '../../../domain/value-objects/payment-method';
import { PaymentStatusType } from '../../../domain/value-objects/payment-status';
import { PaymentEntity } from '../../orm/payment.schema';
import { RefundEntity } from '../../orm/refund.schema';
import { RefundMapper } from './refund.mapper';

type PaymentCreate = CreateFromEntity<PaymentEntity, 'refunds'>;

export type PaymentForCache = Omit<
  IPayment,
  'createdAt' | 'updatedAt' | 'completedAt'
> & {
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
};

export class PaymentMapper {
  static toDomain(entity: PaymentEntity): Payment {
    const props: PaymentProps = {
      id: entity.id,
      orderId: entity.orderId,
      customerId: entity.customerId,
      amount: Number(entity.amount),
      currency: entity.currency,
      paymentMethod: entity.paymentMethod,
      status: entity.status,
      transactionId: entity.transactionId,
      paymentMethodInfo: entity.paymentMethodInfo,
      refundedAmount: Number(entity.refundedAmount),
      refunds: entity.refunds
        ? entity.refunds.map((r) => RefundMapper.toDomain(r).props)
        : [],
      failureReason: entity.failureReason,
      createdAt: entity.createdAt,
      completedAt: entity.completedAt,
      updatedAt: entity.updatedAt,
    };

    return Payment.fromPrimitives(props);
  }

  static toEntity(domain: Payment): PaymentEntity {
    const primitives = domain.toPrimitives();

    const paymentPayload: PaymentCreate = {
      id: primitives.id,
      orderId: primitives.orderId,
      customerId: primitives.customerId,
      amount: primitives.amount,
      currency: primitives.currency,
      paymentMethod: primitives.paymentMethod,
      status: primitives.status,
      transactionId: primitives.transactionId,
      paymentMethodInfo: primitives.paymentMethodInfo,
      refundedAmount: primitives.refundedAmount,
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
    };
  }

  static fromCache(cached: PaymentForCache): Payment {
    return Payment.fromPrimitives({
      ...cached,
      paymentMethod: cached.paymentMethod,
      status: cached.status,
      refunds: cached.refunds || [],
      createdAt: new Date(cached.createdAt),
      updatedAt: new Date(cached.updatedAt),
      completedAt: cached.completedAt ? new Date(cached.completedAt) : null,
    });
  }
}
