// src/modules/orders/domain/value-objects/customer-info.ts
import { ICustomerInfo } from '../interfaces/ICustomerInfo';

export interface CustomerInfoProps {
  customerId: string;
  email: string;
  phone?: string;
  firstName: string;
  lastName: string;
}

export class CustomerInfo {
  private readonly _customerId: string;
  private _email: string;
  private _phone?: string;
  private _firstName: string;
  private _lastName: string;

  constructor(props: CustomerInfoProps) {
    this.validateProps(props);

    this._customerId = props.customerId.trim();
    this._email = props.email.trim().toLowerCase();
    this._phone = props.phone?.trim();
    this._firstName = props.firstName.trim();
    this._lastName = props.lastName.trim();
  }

  private validateProps(props: CustomerInfoProps): void {
    if (!props.customerId?.trim()) {
      throw new Error('Customer ID is required');
    }
    if (!props.email?.trim()) {
      throw new Error('Email is required');
    }
    if (!this.isValidEmail(props.email)) {
      throw new Error('Invalid email format');
    }
    if (!props.firstName?.trim()) {
      throw new Error('First name is required');
    }
    if (!props.lastName?.trim()) {
      throw new Error('Last name is required');
    }
    if (props.phone && !this.isValidPhone(props.phone)) {
      throw new Error('Invalid phone format');
    }
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private isValidPhone(phone: string): boolean {
    const cleanPhone = phone.replace(/[\s-()]/g, '');
    return /^[+]?[1-9][\d]{0,15}$/.test(cleanPhone);
  }

  // Getters
  get customerId(): string {
    return this._customerId;
  }

  get email(): string {
    return this._email;
  }

  get phone(): string | undefined {
    return this._phone;
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

  // Update methods (for order editing context)
  updateEmail(email: string): void {
    if (!email?.trim()) {
      throw new Error('Email is required');
    }
    const trimmedEmail = email.trim().toLowerCase();
    if (!this.isValidEmail(trimmedEmail)) {
      throw new Error('Invalid email format');
    }
    this._email = trimmedEmail;
  }

  updatePhone(phone?: string): void {
    if (phone && !this.isValidPhone(phone)) {
      throw new Error('Invalid phone format');
    }
    this._phone = phone?.trim();
  }

  updateName(firstName: string, lastName: string): void {
    if (!firstName?.trim()) {
      throw new Error('First name is required');
    }
    if (!lastName?.trim()) {
      throw new Error('Last name is required');
    }
    this._firstName = firstName.trim();
    this._lastName = lastName.trim();
  }

  updateContactInfo(updates: {
    email?: string;
    phone?: string;
    firstName?: string;
    lastName?: string;
  }): void {
    if (updates.email !== undefined) {
      this.updateEmail(updates.email);
    }
    if (updates.phone !== undefined) {
      this.updatePhone(updates.phone);
    }
    if (updates.firstName !== undefined || updates.lastName !== undefined) {
      this.updateName(
        updates.firstName ?? this._firstName,
        updates.lastName ?? this._lastName,
      );
    }
  }

  // Value object equality
  equals(other: CustomerInfo): boolean {
    if (!other) return false;
    return (
      this._customerId === other._customerId &&
      this._email === other._email &&
      this._phone === other._phone &&
      this._firstName === other._firstName &&
      this._lastName === other._lastName
    );
  }

  // For persistence/serialization
  toPrimitives(): ICustomerInfo {
    return {
      customerId: this._customerId,
      email: this._email,
      phone: this._phone,
      firstName: this._firstName,
      lastName: this._lastName,
    };
  }

  static fromPrimitives(data: CustomerInfoProps): CustomerInfo {
    return new CustomerInfo(data);
  }

  static create(props: CustomerInfoProps): CustomerInfo {
    return new CustomerInfo(props);
  }
}
