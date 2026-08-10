import { UserListItemDTO } from '../../../core/application/queries/results/user-list-item.result';
import { UserDetailDTO } from '../../../core/application/queries/results/user-detail.result';
import { RawUserListQueryRow } from '../../dto/raw-user-list-query-row.interface';

export class UserQueryMapper {
  static toListItemDto(row: RawUserListQueryRow): UserListItemDTO {
    return {
      id: Number(row.id),
      firstName: String(row.firstName || ''),
      lastName: String(row.lastName || ''),
      email: String(row.email || ''),
      phone: row.phone || null,
      isActive: Boolean(row.isActive),
      createdAt:
        row.createdAt instanceof Date
          ? row.createdAt.toISOString()
          : String(row.createdAt),
    };
  }

  static toDetailDto(row: RawUserListQueryRow): UserDetailDTO {
    const base = this.toListItemDto(row);
    return {
      ...base,
      addressCount: row.addressCount ? Number(row.addressCount) : 0,
      updatedAt: row.updatedAt
        ? row.updatedAt instanceof Date
          ? row.updatedAt.toISOString()
          : String(row.updatedAt)
        : base.createdAt,
    };
  }
}
