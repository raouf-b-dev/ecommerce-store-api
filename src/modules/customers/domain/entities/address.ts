// src/modules/customers/domain/entities/address.ts
import { Result } from '../../../../core/domain/result';
import { DomainError } from '../../../../core/errors/domain.error';
import { ErrorFactory } from '../../../../core/errors/error.factory';
import { IAddress } from '../interfaces/address.interface';
import { AddressType } from '../value-objects/address-type';

export interface AddressProps {
  id: number | null;
  customerId: number;
  street: string;
  street2: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  type: AddressType;
  isDefault: boolean;
  deliveryInstructions: string | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

export class Address implements IAddress {
  private _id: number | null;
  private _customerId: number;
  private _street: string;
  private _street2: string | null;
  private _city: string;
  private _state: string;
  private _postalCode: string;
  private _country: string;
  private _type: AddressType;
  private _isDefault: boolean;
  private _deliveryInstructions: string | null;
  private readonly _createdAt: Date;
  private _updatedAt: Date;

  constructor(props: AddressProps) {
    const validationResult = this.validateProps(props);
    if (validationResult.isFailure) throw validationResult.error;

    this._id = props.id;
    this._customerId = props.customerId;
    this._street = props.street.trim();
    this._street2 = props.street2?.trim() || null;
    this._city = props.city.trim();
    this._state = props.state.trim();
    this._postalCode = props.postalCode.trim();
    this._country = props.country.trim().toUpperCase();
    this._type = props.type;
    this._isDefault = props.isDefault;
    this._deliveryInstructions = props.deliveryInstructions?.trim() || null;
    this._createdAt = props.createdAt || new Date();
    this._updatedAt = props.updatedAt || new Date();
  }

  private validateProps(props: AddressProps): Result<void, DomainError> {
    if (!props.street?.trim()) {
      return ErrorFactory.DomainError('Street address is required');
    }
    if (!props.city?.trim()) {
      return ErrorFactory.DomainError('City is required');
    }
    if (!props.state?.trim()) {
      return ErrorFactory.DomainError('State/Province is required');
    }
    if (!props.postalCode?.trim()) {
      return ErrorFactory.DomainError('Postal code is required');
    }
    if (!props.country?.trim()) {
      return ErrorFactory.DomainError('Country is required');
    }
    if (!Object.values(AddressType).includes(props.type)) {
      return ErrorFactory.DomainError(
        `Invalid address type. Must be one of: ${Object.values(AddressType).join(', ')}`,
      );
    }

    return Result.success(undefined);
  }

  // Getters
  get id(): number | null {
    return this._id;
  }

  get customerId(): number {
    return this._customerId;
  }

  get street(): string {
    return this._street;
  }

  get street2(): string | null {
    return this._street2;
  }

  get city(): string {
    return this._city;
  }

  get state(): string {
    return this._state;
  }

  get postalCode(): string {
    return this._postalCode;
  }

  get country(): string {
    return this._country;
  }

  get type(): AddressType {
    return this._type;
  }

  get isDefault(): boolean {
    return this._isDefault;
  }

  get deliveryInstructions(): string | null {
    return this._deliveryInstructions;
  }

  get createdAt(): Date {
    return new Date(this._createdAt);
  }

  get updatedAt(): Date {
    return new Date(this._updatedAt);
  }

  // Business logic methods
  getFullAddress(): string {
    const addressParts = [
      this._street,
      this._street2,
      this._city,
      this._state,
      this._postalCode,
      this._country,
    ].filter(Boolean);

    return addressParts.join(', ');
  }

  setAsDefault(): void {
    this._isDefault = true;
    this._updatedAt = new Date();
  }

  unsetAsDefault(): void {
    this._isDefault = false;
    this._updatedAt = new Date();
  }

  updateAddress(
    street: string,
    city: string,
    state: string,
    postalCode: string,
    country: string,
    street2: string | null,
    type: AddressType | null,
    deliveryInstructions: string | null,
  ): Result<void, DomainError> {
    const updateProps: AddressProps = {
      id: this._id,
      customerId: this._customerId,
      street,
      street2: street2?.trim() || null,
      city,
      state,
      postalCode,
      country,
      type: type || this._type,
      isDefault: this._isDefault,
      deliveryInstructions: deliveryInstructions || null,
      createdAt: this._createdAt,
      updatedAt: new Date(),
    };

    const validationResult = this.validateProps(updateProps);
    if (validationResult.isFailure) return validationResult;

    this._street = updateProps.street.trim();
    this._street2 = updateProps.street2;
    this._city = updateProps.city.trim();
    this._state = updateProps.state.trim();
    this._postalCode = updateProps.postalCode.trim();
    this._country = updateProps.country.trim().toUpperCase();
    if (type) this._type = type;
    if (deliveryInstructions !== undefined) {
      this._deliveryInstructions = deliveryInstructions?.trim() || null;
    }
    this._updatedAt = new Date();

    return Result.success(undefined);
  }

  // Serialization
  toPrimitives(): IAddress {
    return {
      id: this._id || null,
      customerId: this._customerId,
      street: this._street,
      street2: this._street2,
      city: this._city,
      state: this._state,
      postalCode: this._postalCode,
      country: this._country,
      type: this._type as any,
      isDefault: this._isDefault,
      deliveryInstructions: this._deliveryInstructions,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  static fromPrimitives(data: AddressProps): Address {
    return new Address(data);
  }

  static create(
    customerId: number,
    street: string,
    city: string,
    state: string,
    postalCode: string,
    country: string,
    type: AddressType = AddressType.HOME,
    street2?: string,
    deliveryInstructions?: string,
    isDefault: boolean = false,
  ): Address {
    const address = new Address({
      id: null,
      customerId,
      street,
      street2: street2 || null,
      city,
      state,
      postalCode,
      country,
      type,
      isDefault,
      deliveryInstructions: deliveryInstructions || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return address;
  }
}
