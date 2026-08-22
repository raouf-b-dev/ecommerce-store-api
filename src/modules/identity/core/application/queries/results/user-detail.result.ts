import { UserListItemDTO } from './user-list-item.result';

export interface UserAddressDTO {
  id: number;
  street: string;
  street2?: string | null;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  isDefault: boolean;
  deliveryInstructions?: string | null;
}

export interface UserDetailDTO extends UserListItemDTO {
  addressCount: number;
  addresses?: UserAddressDTO[];
  updatedAt: string;
}
