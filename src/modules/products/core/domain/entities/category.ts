import { Result } from '../../../../../shared-kernel/domain/result';
import { DomainError } from '../../../../../shared-kernel/domain/exceptions/domain.error';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { ICategory } from '../interfaces/category.interface';

export interface CategoryProps {
  id: number | null;
  name: string;
  slug?: string;
  description?: string | null;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

export class Category implements ICategory {
  private _id: number | null;
  private _name: string;
  private _slug: string;
  private _description: string | null;
  private _isActive: boolean;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: CategoryProps) {
    const validationResult = this.validateProps(props);
    if (validationResult.isFailure) throw validationResult.error;

    this._id = props.id || null;
    this._name = props.name.trim();
    this._slug = props.slug?.trim()
      ? this.generateSlug(props.slug)
      : this.generateSlug(props.name);
    this._description = props.description?.trim() || null;
    this._isActive = props.isActive ?? true;
    this._createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();
  }

  private validateProps(props: CategoryProps): Result<void, DomainError> {
    if (!props.name?.trim()) {
      return ErrorFactory.DomainError('Category name is required');
    }
    const slug = props.slug?.trim()
      ? this.generateSlug(props.slug)
      : this.generateSlug(props.name);
    if (!slug) {
      return ErrorFactory.DomainError(
        'Category slug cannot be empty or invalid',
      );
    }
    return Result.success(undefined);
  }

  private generateSlug(value: string): string {
    return value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)+/g, '');
  }

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

  get description(): string | null {
    return this._description;
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

  activate(): Result<void, DomainError> {
    if (this._isActive) {
      return ErrorFactory.DomainError('Category is already active');
    }
    this._isActive = true;
    this._updatedAt = new Date();
    return Result.success(undefined);
  }

  deactivate(): Result<void, DomainError> {
    if (!this._isActive) {
      return ErrorFactory.DomainError('Category is already inactive');
    }
    this._isActive = false;
    this._updatedAt = new Date();
    return Result.success(undefined);
  }

  updateDetails(updates: {
    name?: string;
    slug?: string;
    description?: string | null;
  }): Result<void, DomainError> {
    if (updates.name !== undefined && !updates.name.trim()) {
      return ErrorFactory.DomainError('Category name is required');
    }
    if (updates.slug !== undefined) {
      const slug = this.generateSlug(updates.slug);
      if (!slug) {
        return ErrorFactory.DomainError(
          'Category slug cannot be empty or invalid',
        );
      }
    }

    if (updates.name !== undefined) {
      const trimmedName = updates.name.trim();
      const nameChanged = trimmedName !== this._name;
      this._name = trimmedName;
      if (updates.slug === undefined && nameChanged) {
        this._slug = this.generateSlug(trimmedName);
      }
    }
    if (updates.slug !== undefined) {
      this._slug = this.generateSlug(updates.slug);
    }
    if (updates.description !== undefined) {
      this._description = updates.description?.trim() || null;
    }
    this._updatedAt = new Date();
    return Result.success(undefined);
  }

  toPrimitives(): ICategory {
    return {
      id: this._id,
      name: this._name,
      slug: this._slug,
      description: this._description,
      isActive: this._isActive,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  static fromPrimitives(data: CategoryProps): Category {
    return new Category(data);
  }

  static create(
    props: Omit<CategoryProps, 'id' | 'createdAt' | 'updatedAt'> & {
      id?: number | null;
    },
  ): Category {
    return new Category({
      ...props,
      id: props.id ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}
