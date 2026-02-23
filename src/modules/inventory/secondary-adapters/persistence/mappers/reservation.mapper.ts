import {
  Reservation,
  ReservationProps,
} from '../../../core/domain/entities/reservation';
import { ReservationEntity } from '../../orm/reservation.schema';
import { CreateFromEntity } from '../../../../../shared-kernel/infrastructure/mappers/utils/create-from-entity.type';
import { ReservationItemEntity } from '../../orm/reservation-item.schema';
import { ReservationItemMapper } from './reservation-item.mapper';

type ReservationCreate = CreateFromEntity<ReservationEntity, 'items'>;

export class ReservationMapper {
  static toDomain(entity: ReservationEntity): Reservation {
    const props: ReservationProps = {
      id: entity.id,
      orderId: entity.orderId,
      items: ReservationItemMapper.toDomainArray(entity.items),
      status: entity.status,
      expiresAt: entity.expiresAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };
    return new Reservation(props);
  }

  static toEntity(domain: Reservation): ReservationEntity {
    const payload: ReservationCreate = {
      id: domain.id || 0,
      orderId: domain.orderId,
      status: domain.status,
      expiresAt: domain.expiresAt,
      createdAt: domain.createdAt,
      updatedAt: domain.updatedAt,
    };
    const entity: ReservationEntity = Object.assign(
      new ReservationEntity(),
      payload,
    );

    const reservationItemsEntities: ReservationItemEntity[] =
      ReservationItemMapper.toEntityArray(domain.getItems());

    entity.items = reservationItemsEntities.map((reservationItemEntity) => {
      reservationItemEntity.reservation = entity;
      return reservationItemEntity;
    });

    return entity;
  }

  static toDomainArray(entities: ReservationEntity[]): Reservation[] {
    return entities.map((entity) => ReservationMapper.toDomain(entity));
  }

  static toEntityArray(domains: Reservation[]): ReservationEntity[] {
    return domains.map((domain) => ReservationMapper.toEntity(domain));
  }
}
