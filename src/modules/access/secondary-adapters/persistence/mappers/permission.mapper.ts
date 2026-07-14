import { Permission } from '../../../core/domain/entities/permission';
import { PermissionEntity } from '../../orm/permission.schema';
import { CreateFromEntity } from '../../../../../infrastructure/mappers/utils/create-from-entity.type';

type PermissionCreate = CreateFromEntity<PermissionEntity>;

export class PermissionMapper {
  static toDomain(entity: PermissionEntity): Permission {
    return new Permission({
      id: entity.id,
      code: entity.code,
      description: entity.description,
    });
  }

  static toEntity(domain: Permission): PermissionEntity {
    const primitives = domain.toPrimitives();

    const payload: PermissionCreate = {
      id: primitives.id ?? 0,
      code: primitives.code,
      description: primitives.description ?? '',
    };

    return Object.assign(new PermissionEntity(), payload);
  }

  static toDomainArray(entities: PermissionEntity[]): Permission[] {
    return entities.map((entity) => PermissionMapper.toDomain(entity));
  }

  static toEntityArray(domains: Permission[]): PermissionEntity[] {
    return domains.map((domain) => PermissionMapper.toEntity(domain));
  }
}
