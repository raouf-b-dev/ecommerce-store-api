import { UserQueryMapper } from './user-query.mapper';
import { UserDtoTestFactory } from '../../../testing/factories/user-dto.factory';

describe('UserQueryMapper', () => {
  it('should map raw user query row to DTOs', () => {
    const rawRow = UserDtoTestFactory.createRawUserListQueryRow();

    const listItem = UserQueryMapper.toListItemDto(rawRow);
    const detail = UserQueryMapper.toDetailDto(rawRow);

    expect(listItem).toEqual({
      id: 1,
      firstName: 'John',
      lastName: 'Doe',
      email: 'john.doe@example.com',
      phone: '+1234567890',
      isActive: true,
      createdAt: '2024-01-01T00:00:00.000Z',
    });

    expect(detail).toEqual({
      ...listItem,
      addressCount: 2,
      updatedAt: '2024-01-01T00:00:00.000Z',
    });
  });
});
