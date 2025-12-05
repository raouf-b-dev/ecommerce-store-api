import { CreateFromEntity } from '../../../../../shared/infrastructure/mappers/utils/create-from-entity.type';
import { Refund, RefundProps } from '../../../domain/entities/refund';
import { RefundStatusType } from '../../../domain/value-objects/refund-status';
import { RefundEntity } from '../../orm/refund.schema';

type RefundCreate = CreateFromEntity<RefundEntity, 'payment'>;

export class RefundMapper {
  static toDomain(entity: RefundEntity): Refund {
    const props: RefundProps = {
      id: entity.id,
      paymentId: entity.paymentId,
      amount: Number(entity.amount),
      currency: entity.currency,
      reason: entity.reason,
      status: entity.status as RefundStatusType,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };

    return Refund.fromPrimitives(props);
  }

  static toEntity(domain: Refund): RefundEntity {
    const primitives = domain.toPrimitives();

    const refundPayload: RefundCreate = {
      id: primitives.id || '',
      paymentId: primitives.paymentId,
      amount: primitives.amount,
      currency: primitives.currency,
      reason: primitives.reason,
      status: primitives.status,
      createdAt: primitives.createdAt,
      updatedAt: primitives.updatedAt,
    };

    const entity: RefundEntity = Object.assign(
      new RefundEntity(),
      refundPayload,
    );

    return entity;
  }

  static toEntityArray(refunds: Refund[]): RefundEntity[] {
    return refunds.map((refund) => this.toEntity(refund));
  }
}
