import { UserListItemDTO } from '../../core/application/queries/results/user-list-item.result';
import { UserDetailDTO } from '../../core/application/queries/results/user-detail.result';
import { RawUserListQueryRow } from '../../secondary-adapters/dto/raw-user-list-query-row.interface';

export class UserDtoTestFactory {
  static createRawUserListQueryRow(
    overrides?: Partial<RawUserListQueryRow>,
  ): RawUserListQueryRow {
    return {
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890',
      isActive: true,
      createdAt: new Date('2024-01-01T00:00:00.000Z'),
      updatedAt: new Date('2024-01-01T00:00:00.000Z'),
      addressCount: 2,
      ...overrides,
    };
  }

  static createUserListItemDTO(
    overrides?: Partial<UserListItemDTO>,
  ): UserListItemDTO {
    return {
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890',
      isActive: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      ...overrides,
    };
  }

  static createUserDetailDTO(
    overrides?: Partial<UserDetailDTO>,
  ): UserDetailDTO {
    const base = this.createUserListItemDTO(overrides);
    return {
      ...base,
      addressCount: 2,
      updatedAt: base.createdAt,
      ...overrides,
    };
  }
}
