import { IShippingAddress } from '../interfaces/shipping-address.interface';

// src/modules/orders/domain/value-objects/shipping-address.ts
export interface ShippingAddressProps {
  id: string;
  firstName: string;
  lastName: string;
  street: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
}

export class ShippingAddress implements IShippingAddress {
  private readonly _id: string;
  private readonly _firstName: string;
  private readonly _lastName: string;
  private readonly _street: string;
  private readonly _city: string;
  private readonly _state: string;
  private readonly _postalCode: string;
  private readonly _country: string;
  private readonly _phone?: string;

  constructor(props: ShippingAddressProps) {
    this.validateRequiredFields(props);
    this.validateFormats(props);

    this._id = props.id;
    this._firstName = props.firstName.trim();
    this._lastName = props.lastName.trim();
    this._street = props.street.trim();
    this._city = props.city.trim();
    this._state = props.state.trim();
    this._postalCode = props.postalCode.trim();
    this._country = props.country.trim().toLowerCase();
    this._phone = props.phone?.trim();
  }

  private validateRequiredFields(props: ShippingAddressProps): void {
    const required = [
      { field: 'firstName', value: props.firstName },
      { field: 'lastName', value: props.lastName },
      { field: 'street', value: props.street },
      { field: 'city', value: props.city },
      { field: 'state', value: props.state },
      { field: 'postalCode', value: props.postalCode },
      { field: 'country', value: props.country },
    ];

    for (const { field, value } of required) {
      if (!value?.trim()) {
        throw new Error(`${field} is required`);
      }
    }
  }

  private validateFormats(props: ShippingAddressProps): void {
    if (props.postalCode && !/^[A-Z0-9\s-]{3,12}$/i.test(props.postalCode)) {
      throw new Error('Invalid postal code format');
    }

    const validCountries = ['us', 'ca', 'gb', 'au', 'de', 'fr', 'it', 'es'];
    if (!validCountries.includes(props.country.toLowerCase())) {
      throw new Error(`Unsupported country: ${props.country}`);
    }

    if (
      props.phone &&
      !/^[+]?[1-9][\d]{0,15}$/.test(props.phone.replace(/[\s-()]/g, ''))
    ) {
      throw new Error('Invalid phone number format');
    }
  }

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

  get street(): string {
    return this._street;
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

  get phone(): string | undefined {
    return this._phone;
  }

  getFormattedAddress(): string {
    const lines = [
      this.fullName,
      this._street,
      `${this._city}, ${this._state} ${this._postalCode}`,
      this._country.toUpperCase(),
    ];

    if (this._phone) {
      lines.push(`Phone: ${this._phone}`);
    }

    return lines.join('\n');
  }

  equals(other: ShippingAddress): boolean {
    if (!other) return false;

    return (
      this._firstName === other._firstName &&
      this._lastName === other._lastName &&
      this._street === other._street &&
      this._city === other._city &&
      this._state === other._state &&
      this._postalCode === other._postalCode &&
      this._country === other._country &&
      this._phone === other._phone
    );
  }

  toPrimitives(): IShippingAddress {
    return {
      id: this._id,
      firstName: this._firstName,
      lastName: this._lastName,
      street: this._street,
      city: this._city,
      state: this._state,
      postalCode: this._postalCode,
      country: this._country,
      phone: this._phone,
    };
  }

  static fromPrimitives(data: ShippingAddressProps): ShippingAddress {
    return new ShippingAddress(data);
  }
}
