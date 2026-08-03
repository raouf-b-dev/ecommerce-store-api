import { Product, ProductProps } from '../../../core/domain/entities/product';
import { ProductEntity } from '../../orm/product.schema';

type ProductCreate = Omit<ProductEntity, 'version'>;

export class ProductMapper {
  static toDomain(entity: ProductEntity): Product {
    const props: ProductProps = {
      id: entity.id || null,
      name: entity.name,
      slug: entity.slug,
      description: entity.description,
      price: entity.price,
      currency: entity.currency,
      sku: entity.sku,
      imageUrl: entity.imageUrl,
      categoryId: entity.categoryId,
      isActive: entity.isActive,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
    };

    return Product.fromPrimitives(props);
  }

  static toEntity(domain: Product): ProductEntity {
    const primitives = domain.toPrimitives();

    const payload: ProductCreate = {
      id: primitives.id || 0,
      name: primitives.name,
      slug: primitives.slug,
      description: primitives.description,
      price: primitives.price,
      currency: primitives.currency,
      sku: primitives.sku,
      imageUrl: primitives.imageUrl ?? undefined,
      categoryId: primitives.categoryId ?? undefined,
      isActive: primitives.isActive,
      createdAt: primitives.createdAt,
      updatedAt: primitives.updatedAt,
    };

    return Object.assign(new ProductEntity(), payload);
  }

  static toDomainArray(entities: ProductEntity[]): Product[] {
    return entities.map((entity) => ProductMapper.toDomain(entity));
  }
}
