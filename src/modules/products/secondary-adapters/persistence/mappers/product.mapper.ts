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

export class ProductCacheMapper {
  static toCache(product: Product): IProduct {
    return product.toPrimitives();
  }

  static fromCache(cached: IProduct): Product {
    return Product.fromPrimitives({
      ...cached,
      createdAt: cached.createdAt ? new Date(cached.createdAt) : undefined,
      updatedAt: cached.updatedAt ? new Date(cached.updatedAt) : undefined,
    });
  }

  static fromCacheArray(cachedArray: (IProduct | null)[]): Product[] {
    return cachedArray
      .filter((item): item is IProduct => Boolean(item))
      .map((item) => ProductCacheMapper.fromCache(item));
  }
}
