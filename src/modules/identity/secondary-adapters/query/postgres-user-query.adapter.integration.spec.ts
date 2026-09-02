import { IntegrationTestHelper } from 'test/integration/harness/integration-test.helper';
import { SeededData } from 'test/integration/harness/seed-reference-data';
import { PostgresUserQueryAdapter } from './postgres-user-query.adapter';
import { UserEntity } from '../orm/user.schema';
import { AddressEntity } from '../orm/address.schema';
import { AddressType } from '../../../../shared-kernel/domain/value-objects/address-type';

describe('PostgresUserQueryAdapter (Integration - Real DB)', () => {
  let queryAdapter: PostgresUserQueryAdapter;
  let seededData: SeededData;

  beforeEach(async () => {
    await IntegrationTestHelper.clearDatabase();
    seededData = await IntegrationTestHelper.seedReferenceData();

    const userRepo = IntegrationTestHelper.getRepository(UserEntity);
    queryAdapter = new PostgresUserQueryAdapter(userRepo);
  });

  it('lists users with pagination and search filter', async () => {
    const result = await queryAdapter.list({
      page: 1,
      limit: 10,
      search: 'Customer',
    });

    expect(result.isSuccess).toBe(true);
    if (!result.isSuccess) return;

    expect(result.value.total).toBe(1);
    expect(result.value.items[0].email).toBe(
      'customer.integration@example.com',
    );
    expect(result.value.items[0].roleCode).toBe('CUSTOMER');
  });

  it('filters users by roleCode', async () => {
    const result = await queryAdapter.list({
      page: 1,
      limit: 10,
      roleCode: 'CUSTOMER',
    });

    expect(result.isSuccess).toBe(true);
    if (!result.isSuccess) return;

    expect(result.value.total).toBe(1);
    expect(result.value.items).toHaveLength(1);
    expect(result.value.items[0].email).toBe(
      'customer.integration@example.com',
    );
    expect(result.value.items[0].roleCode).toBe('CUSTOMER');
  });

  it('fetches detailed user DTO by ID with an empty address book', async () => {
    const result = await queryAdapter.getById(seededData.customerUser.id);

    expect(result.isSuccess).toBe(true);
    if (!result.isSuccess) return;

    expect(result.value).not.toBeNull();
    expect(result.value?.id).toBe(seededData.customerUser.id);
    expect(result.value?.email).toBe('customer.integration@example.com');
    expect(result.value?.roleCode).toBe('CUSTOMER');
    expect(result.value?.addressCount).toBe(0);
    expect(result.value?.addresses).toEqual([]);
  });

  it('fetches detailed user DTO with addresses ordered default first', async () => {
    const addressRepo = IntegrationTestHelper.getRepository(AddressEntity);
    await addressRepo.save([
      {
        userId: seededData.customerUser.id,
        street: '200 Oak Ave',
        street2: null,
        city: 'Oakland',
        state: 'CA',
        postalCode: '94601',
        country: 'US',
        type: AddressType.WORK,
        isDefault: false,
        deliveryInstructions: null,
      },
      {
        userId: seededData.customerUser.id,
        street: '100 Main Street',
        street2: 'Apartment 2B',
        city: 'San Francisco',
        state: 'CA',
        postalCode: '94103',
        country: 'US',
        type: AddressType.HOME,
        isDefault: true,
        deliveryInstructions: 'Leave packages at front door.',
      },
    ]);

    const result = await queryAdapter.getById(seededData.customerUser.id);

    expect(result.isSuccess).toBe(true);
    if (!result.isSuccess) return;

    expect(result.value?.addressCount).toBe(2);
    expect(result.value?.addresses).toHaveLength(2);
    expect(result.value?.addresses[0].street).toBe('100 Main Street');
    expect(result.value?.addresses[0].isDefault).toBe(true);
    expect(result.value?.addresses[0].type).toBe(AddressType.HOME);
    expect(result.value?.addresses[0].createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    expect(result.value?.addresses[1].street).toBe('200 Oak Ave');
    expect(result.value?.addresses[1].isDefault).toBe(false);
  });

  it('returns null when querying non-existent user ID', async () => {
    const result = await queryAdapter.getById(99999);

    expect(result.isSuccess).toBe(true);
    if (!result.isSuccess) return;

    expect(result.value).toBeNull();
  });
});
