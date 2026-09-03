import { UserListItemDTO } from '../../../core/application/queries/results/user-list-item.result';
import {
  UserAddressDTO,
  UserDetailDTO,
} from '../../../core/application/queries/results/user-detail.result';
import { AddressEntity } from '../../orm/address.schema';
import { RawUserListQueryRow } from '../../dto/raw-user-list-query-row.interface';

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : String(value);
}

export class UserQueryMapper {
  static toListItemDto(row: RawUserListQueryRow): UserListItemDTO {
    return {
      id: Number(row.id),
      firstName: String(row.firstName || ''),
      lastName: String(row.lastName || ''),
      email: String(row.email || ''),
      phone: row.phone || null,
      isActive: Boolean(row.isActive),
      roleCode: row.roleCode ? String(row.roleCode) : null,
      createdAt: toIsoString(row.createdAt),
    };
  }

  static toAddressDto(entity: AddressEntity): UserAddressDTO {
    return {
      id: entity.id,
      street: entity.street,
      street2: entity.street2,
      city: entity.city,
      state: entity.state,
      postalCode: entity.postalCode,
      country: entity.country,
      type: entity.type,
      isDefault: entity.isDefault,
      deliveryInstructions: entity.deliveryInstructions,
      createdAt: toIsoString(entity.createdAt),
      updatedAt: toIsoString(entity.updatedAt),
    };
  }

  static toDetailDto(
    row: RawUserListQueryRow,
    addressEntities: AddressEntity[] = [],
  ): UserDetailDTO {
    const base = this.toListItemDto(row);
    const addresses = addressEntities.map((entity) =>
      this.toAddressDto(entity),
    );

    return {
      ...base,
      addressCount:
        addresses.length > 0
          ? addresses.length
          : row.addressCount
            ? Number(row.addressCount)
            : 0,
      addresses,
      updatedAt: row.updatedAt ? toIsoString(row.updatedAt) : base.createdAt,
    };
  }
}
