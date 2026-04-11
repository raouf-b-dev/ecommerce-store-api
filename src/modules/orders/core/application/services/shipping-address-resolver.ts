import { Injectable } from '@nestjs/common';
import { ShippingAddressDto } from '../../../primary-adapters/dto/shipping-address.dto';
import { ShippingAddressProps } from '../../domain/value-objects/shipping-address';
import { CheckoutCustomerInfo } from '../ports/customer.gateway';

/**
 * Application Service — Resolves shipping address from either an explicit DTO
 * or the customer's default address.
 *
 * Lives in the application layer because it coordinates between:
 *  - An incoming DTO (primary adapter input)
 *  - A gateway DTO (CheckoutCustomerInfo from CustomerGateway port)
 *  - A domain value object (ShippingAddressProps)
 *
 * The domain layer only ever sees ShippingAddressProps — it has no knowledge
 * of how it was constructed.
 */
@Injectable()
export class ShippingAddressResolver {
  resolveFromDto(
    dto: ShippingAddressDto,
    customer: CheckoutCustomerInfo,
  ): ShippingAddressProps {
    return {
      id: 0,
      firstName: dto.firstName ?? customer.firstName,
      lastName: dto.lastName ?? customer.lastName,
      street: dto.street,
      street2: dto.street2 ?? null,
      city: dto.city,
      state: dto.state,
      postalCode: dto.postalCode,
      country: dto.country,
      phone: dto.phone ?? customer.phone,
      deliveryInstructions: dto.deliveryInstructions ?? null,
    };
  }

  resolveFromDefault(
    customer: CheckoutCustomerInfo,
  ): ShippingAddressProps | null {
    const defaultAddress = customer.addresses.find((addr) => addr.isDefault);
    if (!defaultAddress) return null;

    return {
      id: defaultAddress.id!,
      firstName: customer.firstName,
      lastName: customer.lastName,
      street: defaultAddress.street,
      street2: defaultAddress.street2,
      city: defaultAddress.city,
      state: defaultAddress.state,
      postalCode: defaultAddress.postalCode,
      country: defaultAddress.country,
      phone: customer.phone,
      deliveryInstructions: defaultAddress.deliveryInstructions,
    };
  }

  resolve(
    dto: ShippingAddressDto | undefined,
    customer: CheckoutCustomerInfo,
  ): ShippingAddressProps | null {
    if (dto) {
      return this.resolveFromDto(dto, customer);
    }
    return this.resolveFromDefault(customer);
  }
}
