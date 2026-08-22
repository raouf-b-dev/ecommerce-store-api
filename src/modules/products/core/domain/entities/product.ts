// src/modules/products/domain/entities/product.entity.ts
import { IProduct } from '../interfaces/product.interface';
import { Result } from '../../../../../shared-kernel/domain/result';
import { DomainError } from '../../../../../shared-kernel/domain/exceptions/domain.error';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';

export interface ProductProps {
  id: number | null;
  name: string;
  slug?: string;
  description?: string;
  price: number;
  currency?: string;
  sku?: string;
  imageUrl?: string | null;
  categoryId?: number | null;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface UpdateProductDomainProps {
  name?: string;
  description?: string;
  price?: number;
  currency?: string;
  sku?: string;
  imageUrl?: string | null;
  categoryId?: number | null;
}

export class Product implements IProduct {
  private _id: number | null;
  private _name: string;
  private _slug: string;
  private _description?: string;
  private _price: number;
  private _currency: string;
  private _sku?: string;
  private _imageUrl?: string | null;
  private _categoryId?: number | null;
  private _isActive: boolean;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: ProductProps) {
    const validationResult = this.validateProps(props);
    if (validationResult.isFailure) throw validationResult.error;

    this._id = props.id || null;
    this._name = props.name.trim();
    this._slug = props.slug?.trim()
      ? this.generateSlug(props.slug)
      : this.generateSlug(props.name);
    this._description = props.description?.trim();
    this._price = this.roundPrice(props.price);
    this._currency = props.currency?.trim().toUpperCase() || 'USD';
    this._sku = props.sku?.trim().toUpperCase();
    this._imageUrl = props.imageUrl?.trim() || null;
    this._categoryId = props.categoryId ?? null;
    this._isActive = props.isActive ?? true;
    this._createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();
  }

  private validateProps(props: ProductProps): Result<void, DomainError> {
    if (!props.name?.trim()) {
      return ErrorFactory.DomainError('Product name is required');
    }
    if (props.price < 0) {
      return ErrorFactory.DomainError('Product price cannot be negative');
    }
    const slug = props.slug?.trim()
      ? this.generateSlug(props.slug)
      : this.generateSlug(props.name);
    if (!slug) {
      return ErrorFactory.DomainError(
        'Product slug cannot be empty or invalid',
      );
    }
    return Result.success(undefined);
  }

  private generateSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }

  private roundPrice(price: number): number {
    return Math.round(price * 100) / 100;
  }

  // Getters
  get id(): number | null {
    return this._id;
  }
  setId(id: number): void {
    this._id = id;
  }

  get name(): string {
    return this._name;
  }

  get slug(): string {
    return this._slug;
  }

  get description(): string | undefined {
    return this._description;
  }

  get price(): number {
    return this._price;
  }

  get currency(): string {
    return this._currency;
  }

  get sku(): string | undefined {
    return this._sku;
  }

  get imageUrl(): string | null | undefined {
    return this._imageUrl;
  }

  get categoryId(): number | null | undefined {
    return this._categoryId;
  }

  get isActive(): boolean {
    return this._isActive;
  }

  get createdAt(): Date {
    return new Date(this._createdAt);
  }

  get updatedAt(): Date {
    return new Date(this._updatedAt);
  }

  // Update methods
  updateName(name: string): Result<void, DomainError> {
    if (!name?.trim()) {
      return ErrorFactory.DomainError('Product name cannot be empty');
    }
    this._name = name.trim();
    this._slug = this.generateSlug(this._name);
    this._updatedAt = new Date();
    return Result.success(undefined);
  }

  updateDescription(description?: string): void {
    this._description = description?.trim();
    this._updatedAt = new Date();
  }

  updatePrice(price: number): Result<void, DomainError> {
    if (price < 0) {
      return ErrorFactory.DomainError('Product price cannot be negative');
    }
    this._price = this.roundPrice(price);
    this._updatedAt = new Date();
    return Result.success(undefined);
  }

  updateSku(sku?: string): void {
    this._sku = sku?.trim().toUpperCase();
    this._updatedAt = new Date();
  }

  activate(): void {
    this._isActive = true;
    this._updatedAt = new Date();
  }

  deactivate(): void {
    this._isActive = false;
    this._updatedAt = new Date();
  }

  updateProduct(updates: UpdateProductDomainProps): void {
    if (updates.name !== undefined) {
      this.updateName(updates.name);
    }
    if (updates.description !== undefined) {
      this.updateDescription(updates.description);
    }
    if (updates.price !== undefined) {
      this.updatePrice(updates.price);
    }
    if (updates.currency !== undefined) {
      this._currency = updates.currency.trim().toUpperCase();
    }
    if (updates.sku !== undefined) {
      this.updateSku(updates.sku);
    }
    if (updates.imageUrl !== undefined) {
      this._imageUrl = updates.imageUrl?.trim() || null;
    }
    if (updates.categoryId !== undefined) {
      this._categoryId = updates.categoryId;
    }
    this._updatedAt = new Date();
  }

  // Serialization
  toPrimitives(): IProduct {
    return {
      id: this._id,
      name: this._name,
      slug: this._slug,
      description: this._description,
      price: this._price,
      currency: this._currency,
      sku: this._sku,
      imageUrl: this._imageUrl,
      categoryId: this._categoryId,
      isActive: this._isActive,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  static fromPrimitives(data: ProductProps): Product {
    return new Product(data);
  }

  static create(
    props: Omit<ProductProps, 'id' | 'createdAt' | 'updatedAt'> & {
      id: number | null;
    },
  ): Product {
    return new Product({
      ...props,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}
