import { Category, CategoryProps } from '../../../core/domain/entities/category';
import { CategoryEntity } from '../../orm/category.schema';

export class CategoryMapper {
  static toDomain(entity: CategoryEntity): Category {
    const props: CategoryProps = {
      id: entity.id || null,
      name: entity.name,
      slug: entity.slug,
      description: entity.description,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };

    return Category.fromPrimitives(props);
  }

  static toEntity(domain: Category): CategoryEntity {
    const primitives = domain.toPrimitives();

    return Object.assign(new CategoryEntity(), {
      id: primitives.id || 0,
      name: primitives.name,
      slug: primitives.slug,
      description: primitives.description,
      isActive: primitives.isActive,
      createdAt: primitives.createdAt,
      updatedAt: primitives.updatedAt,
    });
  }

  static toDomainArray(entities: CategoryEntity[]): Category[] {
    return entities.map((entity) => CategoryMapper.toDomain(entity));
  }
}
