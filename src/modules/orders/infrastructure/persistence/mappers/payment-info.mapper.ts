// src/modules/orders/infrastructure/mappers/payment-info.mapper.ts
import { IPaymentInfo } from '../../../domain/interfaces/payment-info.interface';
import {
  PaymentInfo,
  PaymentInfoProps,
} from '../../../domain/value-objects/payment-info';
import { PaymentInfoEntity } from '../../orm/payment-info.schema';

export class PaymentInfoMapper {
  static toDomain(entity: PaymentInfoEntity): PaymentInfo {
    const props: PaymentInfoProps = {
      id: entity.id,
      method: entity.method,
      status: entity.status,
      amount: entity.amount,
      transactionId: entity.transactionId,
      paidAt: entity.paidAt,
      notes: entity.notes,
    };

    return PaymentInfo.fromPrimitives(props);
  }

  static toEntity(primitives: IPaymentInfo): PaymentInfoEntity {
    const entity: PaymentInfoEntity = {
      id: primitives.id,
      method: primitives.method,
      status: primitives.status,
      amount: primitives.amount,
      transactionId: primitives.transactionId,
      paidAt: primitives.paidAt,
      notes: primitives.notes,
    };

    return entity;
  }

  static toDomainArray(entities: PaymentInfoEntity[]): PaymentInfo[] {
    return entities.map((entity) => PaymentInfoMapper.toDomain(entity));
  }

  static toEntityArray(domains: PaymentInfo[]): PaymentInfoEntity[] {
    return domains.map((domain) => PaymentInfoMapper.toEntity(domain));
  }
}
