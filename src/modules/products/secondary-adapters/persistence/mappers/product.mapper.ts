import { UpdateFromEntity } from '../../../../../infrastructure/mappers/utils/update-from-entity.type';
import { Product, ProductProps } from '../../../core/domain/entities/product';
import { IProduct } from '../../../core/domain/interfaces/product.interface';
import { ProductEntity } from '../../orm/product.schema';

type ProductCreate = Omit<ProductEntity, 'version'>;

export type ProductUpdate = UpdateFromEntity<
  ProductEntity,
  'id' | 'version' | 'createdAt' | 'updatedAt'
>; // persistence-owned: identity, OCC, @CreateDateColumn, @UpdateDateColumn

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

  static toUpdatePayload(domain: Product): ProductUpdate {
    const entity = ProductMapper.toEntity(domain);

    return {
      name: entity.name,
      slug: entity.slug,
      description: entity.description,
      sku: entity.sku,
      price: entity.price,
      currency: entity.currency,
      imageUrl: entity.imageUrl,
      categoryId: entity.categoryId,
      isActive: entity.isActive,
    };
  }

  static toDomainArray(entities: ProductEntity[]): Product[] {
    return entities.map((entity) => ProductMapper.toDomain(entity));
  }
}

export type ProductForCache = Omit<IProduct, 'createdAt' | 'updatedAt'> & {
  createdAt: number;
  updatedAt: number;
};

export class ProductCacheMapper {
  static toCache(product: Product): ProductForCache {
    const primitives = product.toPrimitives();
    return {
      ...primitives,
      createdAt: primitives.createdAt.getTime(),
      updatedAt: primitives.updatedAt.getTime(),
    };
  }

  static fromCache(cached: ProductForCache): Product | null {
    try {
      return Product.fromPrimitives({
        ...cached,
        createdAt: new Date(cached.createdAt),
        updatedAt: new Date(cached.updatedAt),
      });
    } catch {
      return null;
    }
  }
}
