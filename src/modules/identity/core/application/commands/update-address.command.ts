import { CallerContext } from '../../../../../shared-kernel/domain/interfaces/caller-context.interface';

export interface UpdateAddressCommand {
  addressId: number;
  userId: number;
  street?: string;
  street2?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  isDefault?: boolean;
  deliveryInstructions?: string;
  callerContext: CallerContext;
}
