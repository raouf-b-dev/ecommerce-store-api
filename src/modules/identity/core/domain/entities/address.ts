// src/modules/users/domain/entities/address.ts
import { Result } from '../../../../../shared-kernel/domain/result';
import { DomainError } from '../../../../../shared-kernel/domain/exceptions/domain.error';
import { ErrorFactory } from '../../../../../shared-kernel/domain/exceptions/error.factory';
import { IAddress } from '../interfaces/address.interface';
import { AddressType } from '../../../../../shared-kernel/domain/value-objects/address-type';

export interface AddressProps {
  id: number | null;
  userId: number;
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

export interface UpdateAddressProps {
  street: string | null;
  street2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  country: string | null;
  type: AddressType | null;
  deliveryInstructions: string | null;
}

export class Address implements IAddress {
  private _id: number | null;
  private _userId: number;
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
    this._userId = props.userId;
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

  get userId(): number {
    return this._userId;
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

  updateAddress(input: UpdateAddressProps): Result<void, DomainError> {
    const updateProps: AddressProps = {
      id: this._id,
      userId: this._userId,
      street: input.street ?? this._street,
      street2: input.street2 ?? this._street2,
      city: input.city ?? this._city,
      state: input.state ?? this._state,
      postalCode: input.postalCode ?? this._postalCode,
      country: input.country ?? this._country,
      type: input.type ?? this._type,
      isDefault: this._isDefault,
      deliveryInstructions:
        input.deliveryInstructions ?? this._deliveryInstructions,
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
    if (input.type) this._type = input.type;
    if (input.deliveryInstructions !== undefined) {
      this._deliveryInstructions = input.deliveryInstructions?.trim() || null;
    }
    this._updatedAt = new Date();

    return Result.success(undefined);
  }

  // Serialization
  toPrimitives(): IAddress {
    return {
      id: this._id || null,
      userId: this._userId,
      street: this._street,
      street2: this._street2,
      city: this._city,
      state: this._state,
      postalCode: this._postalCode,
      country: this._country,
      type: this._type,
      isDefault: this._isDefault,
      deliveryInstructions: this._deliveryInstructions,
      createdAt: this._createdAt,
      updatedAt: this._updatedAt,
    };
  }

  static fromProps(data: AddressProps): Address {
    return new Address(data);
  }

  static create(props: AddressProps): Address {
    const address = new Address({
      id: null,
      userId: props.userId,
      street: props.street,
      street2: props.street2 || null,
      city: props.city,
      state: props.state,
      postalCode: props.postalCode,
      country: props.country,
      type: props.type,
      isDefault: props.isDefault,
      deliveryInstructions: props.deliveryInstructions || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return address;
  }
}
