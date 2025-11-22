// src/modules/customers/domain/entities/customer.ts
import { Result } from '../../../../core/domain/result';
import { DomainError } from '../../../../core/errors/domain.error';
import { ErrorFactory } from '../../../../core/errors/error.factory';
import { IAddress } from '../interfaces/address.interface';
import { ICustomer } from '../interfaces/customer.interface';
import { AddressType } from '../value-objects/address-type';
import { Address, AddressProps } from './address';

export interface CustomerProps {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  addresses: AddressProps[];
  totalOrders: number;
  totalSpent: number;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export class Customer implements ICustomer {
  private readonly _id: string;
  private _firstName: string;
  private _lastName: string;
  private readonly _email: string;
  private _phone: string | null;
  private _addresses: Address[];
  private _totalOrders: number;
  private _totalSpent: number;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: CustomerProps) {
    const validationResult = this.validateProps(props);
    if (validationResult.isFailure) throw validationResult.error;

    this._id = props.id.trim();
    this._firstName = props.firstName.trim();
    this._lastName = props.lastName.trim();
    this._email = props.email.trim().toLowerCase();
    this._phone = props.phone?.trim() || null;
    this._addresses = props.addresses.map((addr) =>
      Address.fromPrimitives(addr),
    );
    this._totalOrders = props.totalOrders;
    this._totalSpent = this.roundPrice(props.totalSpent);
    this._createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();
  }

  private validateProps(props: CustomerProps): Result<void, DomainError> {
    if (!props.id?.trim()) {
      return ErrorFactory.DomainError('Customer ID is required');
    }
    if (!props.firstName?.trim()) {
      return ErrorFactory.DomainError('First name is required');
    }
    if (!props.lastName?.trim()) {
      return ErrorFactory.DomainError('Last name is required');
    }
    if (!props.email?.trim()) {
      return ErrorFactory.DomainError('Email is required');
    }
    if (!this.isValidEmail(props.email)) {
      return ErrorFactory.DomainError('Invalid email format');
    }
    if (props.totalOrders < 0) {
      return ErrorFactory.DomainError('Total orders cannot be negative');
    }
    if (props.totalSpent < 0) {
      return ErrorFactory.DomainError('Total spent cannot be negative');
    }

    return Result.success(undefined);
  }

  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  private roundPrice(price: number): number {
    return Math.round(price * 100) / 100;
  }

  // Getters
  get id(): string {
    return this._id;
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

  get email(): string {
    return this._email;
  }

  get phone(): string | null {
    return this._phone;
  }

  get addresses(): IAddress[] {
    return this._addresses.map((addr) => addr.toPrimitives());
  }

  get totalOrders(): number {
    return this._totalOrders;
  }

  get totalSpent(): number {
    return this._totalSpent;
  }

  get createdAt(): Date {
    return new Date(this._createdAt);
  }

  get updatedAt(): Date {
    return new Date(this._updatedAt);
  }

  // Business logic methods
  hasAddresses(): boolean {
    return this._addresses.length > 0;
  }

  hasDefaultAddress(): boolean {
    return this._addresses.some((addr) => addr.isDefault);
  }

  getDefaultAddress(): Address | undefined {
    return this._addresses.find((addr) => addr.isDefault);
  }

  findAddress(addressId: string): Address | undefined {
    return this._addresses.find((addr) => addr.id === addressId);
  }

  addAddress(address: Address): Result<void, DomainError> {
    if (this._addresses.length >= 10) {
      return ErrorFactory.DomainError('Customer can have maximum 10 addresses');
    }

    // If this is the first address or explicitly marked as default, set as default
    if (this._addresses.length === 0 || address.isDefault) {
      // Unset other default addresses
      this._addresses.forEach((addr) => addr.unsetAsDefault());
      address.setAsDefault();
    }

    this._addresses.push(address);
    this._updatedAt = new Date();
    return Result.success(undefined);
  }

  updateAddress(
    addressId: string,
    street: string,
    city: string,
    state: string,
    postalCode: string,
    country: string,
    street2?: string,
    type?: AddressType,
    deliveryInstructions?: string,
  ): Result<void, DomainError> {
    const address = this.findAddress(addressId);
    if (!address) {
      return ErrorFactory.DomainError(`Address with ID ${addressId} not found`);
    }

    const updateResult = address.updateAddress(
      street,
      city,
      state,
      postalCode,
      country,
      street2,
      type,
      deliveryInstructions,
    );
    if (updateResult.isFailure) return updateResult;

    this._updatedAt = new Date();
    return Result.success(undefined);
  }

  removeAddress(addressId: string): Result<void, DomainError> {
    const index = this._addresses.findIndex((addr) => addr.id === addressId);
    if (index === -1) {
      return ErrorFactory.DomainError(`Address with ID ${addressId} not found`);
    }

    const addressToRemove = this._addresses[index];
    this._addresses.splice(index, 1);

    // If removed address was default and we still have addresses, set first as default
    if (addressToRemove.isDefault && this._addresses.length > 0) {
      this._addresses[0].setAsDefault();
    }

    this._updatedAt = new Date();
    return Result.success(undefined);
  }

  setDefaultAddress(addressId: string): Result<void, DomainError> {
    const address = this.findAddress(addressId);
    if (!address) {
      return ErrorFactory.DomainError(`Address with ID ${addressId} not found`);
    }

    // Unset all current default addresses
    this._addresses.forEach((addr) => addr.unsetAsDefault());
    address.setAsDefault();

    this._updatedAt = new Date();
    return Result.success(undefined);
  }

  updatePersonalInfo(
    firstName: string,
    lastName: string,
    phone?: string,
  ): Result<void, DomainError> {
    if (!firstName?.trim()) {
      return ErrorFactory.DomainError('First name cannot be empty');
    }
    if (!lastName?.trim()) {
      return ErrorFactory.DomainError('Last name cannot be empty');
    }

    this._firstName = firstName.trim();
    this._lastName = lastName.trim();
    if (phone !== undefined) {
      this._phone = phone?.trim() || null;
    }
    this._updatedAt = new Date();

    return Result.success(undefined);
  }

  recordOrder(orderAmount: number): Result<void, DomainError> {
    if (orderAmount < 0) {
      return ErrorFactory.DomainError('Order amount cannot be negative');
    }

    this._totalOrders += 1;
    this._totalSpent = this.roundPrice(this._totalSpent + orderAmount);
    this._updatedAt = new Date();

    return Result.success(undefined);
  }

  // Serialization
  toPrimitives(): ICustomer {
    return {
      id: this._id,
      firstName: this._firstName,
      lastName: this._lastName,
      email: this._email,
      phone: this._phone,
      addresses: this._addresses.map((addr) => addr.toPrimitives()),
      totalOrders: this._totalOrders,
      totalSpent: this._totalSpent,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  static fromPrimitives(data: CustomerProps): Customer {
    return new Customer(data);
  }

  static create(
    id: string,
    firstName: string,
    lastName: string,
    email: string,
    phone?: string,
  ): Customer {
    return new Customer({
      id,
      firstName,
      lastName,
      email,
      phone: phone || null,
      addresses: [],
      totalOrders: 0,
      totalSpent: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
}
