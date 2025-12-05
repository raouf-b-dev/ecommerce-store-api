import { Result } from '../../../../core/domain/result';
import { DomainError } from '../../../../core/errors/domain.error';
import { ErrorFactory } from '../../../../core/errors/error.factory';
import { IUser } from '../interfaces/user.interface';
import { UserRole, UserRoleType } from '../value-objects/user-role';

export interface UserProps {
  id: string | null;
  email: string;
  passwordHash: string;
  role: UserRoleType;
  customerId: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export class User implements IUser {
  private readonly _id: string | null;
  private _email: string;
  private _passwordHash: string;
  private _role: UserRole;
  private _customerId: string | null;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: UserProps) {
    const validationResult = this.validateProps(props);
    if (validationResult.isFailure) throw validationResult.error;

    this._id = props.id?.trim() || null;
    this._email = props.email.trim().toLowerCase();
    this._passwordHash = props.passwordHash;
    this._role = new UserRole(props.role);
    this._customerId = props.customerId?.trim() || null;
    this._createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();
  }

  private validateProps(props: UserProps): Result<void, DomainError> {
    if (props.id !== null && !props.id?.trim()) {
      return ErrorFactory.DomainError('User ID is required');
    }
    if (!props.email?.trim()) {
      return ErrorFactory.DomainError('Email is required');
    }
    if (!this.isValidEmail(props.email)) {
      return ErrorFactory.DomainError('Invalid email format');
    }
    if (!props.passwordHash?.trim()) {
      return ErrorFactory.DomainError('Password hash is required');
    }

    return Result.success(undefined);
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  // Getters
  get id(): string | null {
    return this._id;
  }

  get email(): string {
    return this._email;
  }

  get passwordHash(): string {
    return this._passwordHash;
  }

  get role(): UserRoleType {
    return this._role.value;
  }

  get customerId(): string | null {
    return this._customerId;
  }

  get createdAt(): Date {
    return new Date(this._createdAt);
  }

  get updatedAt(): Date {
    return new Date(this._updatedAt);
  }

  // Business Logic
  changePassword(newPasswordHash: string): Result<void, DomainError> {
    if (!newPasswordHash?.trim()) {
      return ErrorFactory.DomainError('New password hash cannot be empty');
    }
    this._passwordHash = newPasswordHash;
    this._updatedAt = new Date();
    return Result.success(undefined);
  }

  assignCustomer(customerId: string): Result<void, DomainError> {
    if (!customerId?.trim()) {
      return ErrorFactory.DomainError('Customer ID cannot be empty');
    }
    this._customerId = customerId.trim();
    this._updatedAt = new Date();
    return Result.success(undefined);
  }

  // Serialization
  get toProps(): UserProps {
    return {
      id: this._id,
      email: this._email,
      passwordHash: this._passwordHash,
      role: this._role.value,
      customerId: this._customerId,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  toPrimitives(): IUser {
    return {
      id: this._id,
      email: this._email,
      passwordHash: this._passwordHash,
      role: this._role.value,
      customerId: this._customerId,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  static fromPrimitives(data: IUser): User {
    const userProps: UserProps = {
      id: data.id,
      email: data.email,
      passwordHash: data.passwordHash,
      role: data.role,
      customerId: data.customerId,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
    };
    return new User(userProps);
  }

  static create(
    id: string | null,
    email: string,
    passwordHash: string,
    role: UserRoleType = UserRoleType.CUSTOMER,
    customerId?: string,
  ): User {
    return new User({
      id,
      email,
      passwordHash,
      role,
      customerId: customerId || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}
