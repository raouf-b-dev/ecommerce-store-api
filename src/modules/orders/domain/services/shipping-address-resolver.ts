import { Injectable } from '@nestjs/common';
import { ShippingAddressDto } from '../../presentation/dto/shipping-address.dto';
import { ShippingAddressProps } from '../value-objects/shipping-address';
import { ICustomer } from '../../../customers/domain/interfaces/customer.interface';

@Injectable()
export class ShippingAddressResolver {
  resolveFromDto(
    dto: ShippingAddressDto,
    customer: ICustomer,
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

  resolveFromDefault(customer: ICustomer): ShippingAddressProps | null {
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
    customer: ICustomer,
  ): ShippingAddressProps | null {
    if (dto) {
      return this.resolveFromDto(dto, customer);
    }
    return this.resolveFromDefault(customer);
  }
}
