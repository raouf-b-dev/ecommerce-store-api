import { DomainError } from '../../../../../shared-kernel/errors/domain.error';

export enum UserRoleType {
  ADMIN = 'ADMIN',
  CUSTOMER = 'CUSTOMER',
}

export class UserRole {
  private readonly _value: UserRoleType;

  constructor(value: UserRoleType) {
    if (!Object.values(UserRoleType).includes(value)) {
      throw new DomainError(`Invalid user role: ${value}`);
    }
    this._value = value;
  }

  get value(): UserRoleType {
    return this._value;
  }

  isAdmin(): boolean {
    return this._value === UserRoleType.ADMIN;
  }

  isCustomer(): boolean {
    return this._value === UserRoleType.CUSTOMER;
  }

  toString(): string {
    return this._value;
  }

  static from(value: string): UserRole {
    return new UserRole(value as UserRoleType);
  }
}
