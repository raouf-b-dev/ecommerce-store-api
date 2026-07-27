import { Injectable } from '@nestjs/common';
import { CheckoutUserInfoResult } from '../ports/user.gateway';
import { ShippingAddressProps } from '../../domain/value-objects/shipping-address';

export interface ShippingAddressInput {
  firstName?: string;
  lastName?: string;
  street: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  phone?: string;
  deliveryInstructions?: string;
}

/**
 * Application Service — Resolves shipping address from either an explicit DTO
 * or the user's default address.
 *
 * Lives in the application layer because it coordinates between:
 *  - An incoming DTO (primary adapter input)
 *  - A gateway DTO (CheckoutUserInfo from UserGateway port)
 *  - A domain value object (ShippingAddressProps)
 *
 * The domain layer only ever sees ShippingAddressProps — it has no knowledge
 * of how it was constructed.
 */
@Injectable()
export class ShippingAddressResolver {
  resolveFromDto(
    dto: ShippingAddressInput,
    user: CheckoutUserInfoResult,
  ): ShippingAddressProps {
    return {
      id: 0,
      firstName: dto.firstName ?? user.firstName,
      lastName: dto.lastName ?? user.lastName,
      street: dto.street,
      street2: dto.street2 ?? null,
      city: dto.city,
      state: dto.state,
      postalCode: dto.postalCode,
      country: dto.country,
      phone: dto.phone ?? user.phone,
      deliveryInstructions: dto.deliveryInstructions ?? null,
    };
  }

  resolveFromDefault(
    user: CheckoutUserInfoResult,
  ): ShippingAddressProps | null {
    const defaultAddress = user.addresses.find((addr) => addr.isDefault);
    if (!defaultAddress) return null;

    return {
      id: defaultAddress.id!,
      firstName: user.firstName,
      lastName: user.lastName,
      street: defaultAddress.street,
      street2: defaultAddress.street2,
      city: defaultAddress.city,
      state: defaultAddress.state,
      postalCode: defaultAddress.postalCode,
      country: defaultAddress.country,
      phone: user.phone,
      deliveryInstructions: defaultAddress.deliveryInstructions,
    };
  }

  resolve(
    dto: ShippingAddressInput | undefined,
    user: CheckoutUserInfoResult,
  ): ShippingAddressProps | null {
    if (dto) {
      return this.resolveFromDto(dto, user);
    }
    return this.resolveFromDefault(user);
  }
}
