import { AddressType } from 'src/shared-kernel/domain/value-objects/address-type';
import { UserDtoTestFactory } from 'src/modules/identity/testing';
import { AddressEntity } from '../../orm/address.schema';
import { UserQueryMapper } from './user-query.mapper';

function addressEntity(overrides: Partial<AddressEntity> = {}): AddressEntity {
  return {
    id: 10,
    street: '100 Main Street',
    street2: 'Apartment 2B',
    city: 'San Francisco',
    state: 'CA',
    postalCode: '94103',
    country: 'USA',
    type: AddressType.HOME,
    isDefault: true,
    deliveryInstructions: 'Leave packages at front door.',
    userId: 1,
    createdAt: new Date('2025-01-01T10:00:00.000Z'),
    updatedAt: new Date('2025-01-02T12:00:00.000Z'),
    ...overrides,
  } as AddressEntity;
}

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
      roleCode: 'CUSTOMER',
      createdAt: '2024-01-01T00:00:00.000Z',
    });

    expect(detail).toEqual({
      ...listItem,
      addressCount: 2,
      addresses: [],
      updatedAt: '2024-01-01T00:00:00.000Z',
    });
  });

  it('should map address entities onto the detail DTO with ISO dates', () => {
    const rawRow = UserDtoTestFactory.createRawUserListQueryRow({
      addressCount: 0,
    });
    const defaultAddress = addressEntity();
    const otherAddress = addressEntity({
      id: 11,
      street: '200 Oak Ave',
      street2: null,
      isDefault: false,
      deliveryInstructions: null,
    });

    const detail = UserQueryMapper.toDetailDto(rawRow, [
      defaultAddress,
      otherAddress,
    ]);

    expect(detail.addressCount).toBe(2);
    expect(detail.addresses).toEqual([
      {
        id: 10,
        street: '100 Main Street',
        street2: 'Apartment 2B',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94103',
        country: 'USA',
        type: AddressType.HOME,
        isDefault: true,
        deliveryInstructions: 'Leave packages at front door.',
        createdAt: '2025-01-01T10:00:00.000Z',
        updatedAt: '2025-01-02T12:00:00.000Z',
      },
      {
        id: 11,
        street: '200 Oak Ave',
        street2: null,
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94103',
        country: 'USA',
        type: AddressType.HOME,
        isDefault: false,
        deliveryInstructions: null,
        createdAt: '2025-01-01T10:00:00.000Z',
        updatedAt: '2025-01-02T12:00:00.000Z',
      },
    ]);
  });
});
