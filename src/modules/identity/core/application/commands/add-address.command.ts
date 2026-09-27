import { CallerContext } from '../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import { AddressType } from '../../../../../shared-kernel/domain/value-objects/address-type';

export interface AddAddressCommand {
  userId: number;
  street: string;
  street2?: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  type?: AddressType;
  isDefault?: boolean;
  deliveryInstructions?: string;
  callerContext: CallerContext;
}
