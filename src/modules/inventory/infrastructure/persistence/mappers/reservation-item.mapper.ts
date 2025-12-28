import { CreateFromEntity } from '../../../../../shared/infrastructure/mappers/utils/create-from-entity.type';
import {
  ReservationItem,
  ReservationItemProps,
} from '../../../domain/entities/reservation-item';
import { ReservationItemEntity } from '../../orm/reservation-item.schema';

export type ReservationItemCreate = CreateFromEntity<
  ReservationItemEntity,
  'reservation'
>;

export class ReservationItemMapper {
  static toDomain(entity: ReservationItemEntity): ReservationItem {
    const props: ReservationItemProps = {
      id: entity.id,
      productId: entity.productId,
      quantity: entity.quantity,
    };
    const result = ReservationItem.create(props);
    if (result.isFailure) throw result.error;
    return result.value;
  }

  static toEntity(domain: ReservationItem): ReservationItemEntity {
    const primitives = domain.toPrimitives();
    const payload: ReservationItemCreate = {
      id: primitives.id || 0,
      productId: primitives.productId,
      quantity: primitives.quantity,
    };
    return Object.assign(new ReservationItemEntity(), payload);
  }

  static toDomainArray(entities: ReservationItemEntity[]): ReservationItem[] {
    return entities.map((entity) => ReservationItemMapper.toDomain(entity));
  }

  static toEntityArray(domains: ReservationItem[]): ReservationItemEntity[] {
    return domains.map((domain) => ReservationItemMapper.toEntity(domain));
  }
}
