// src/modules/customers/domain/value-objects/customer-name.ts
import { DomainError } from '../../../../../shared-kernel/errors/domain.error';

export class CustomerName {
  private readonly _firstName: string;
  private readonly _lastName: string;

  constructor(firstName: string, lastName: string) {
    if (!firstName?.trim()) {
      throw new DomainError('First name cannot be empty');
    }
    if (!lastName?.trim()) {
      throw new DomainError('Last name cannot be empty');
    }

    this._firstName = firstName.trim();
    this._lastName = lastName.trim();
  }

  get firstName(): string {
    return this._firstName;
  }

  get lastName(): string {
    return this._lastName;
  }

  get fullName(): string {
    return `${this._firstName} ${this._lastName}`;
  }

  equals(other: CustomerName): boolean {
    return (
      this._firstName === other._firstName && this._lastName === other._lastName
    );
  }

  toString(): string {
    return this.fullName;
  }

  static from(firstName: string, lastName: string): CustomerName {
    return new CustomerName(firstName, lastName);
  }
}
