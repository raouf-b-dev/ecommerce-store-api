import { IntegrationTestHelper } from 'test/integration/harness/integration-test.helper';
import { SeededData } from 'test/integration/harness/seed-reference-data';
import { PostgresUserQueryAdapter } from './postgres-user-query.adapter';
import { UserEntity } from '../orm/user.schema';

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
  });

  it('fetches detailed user DTO by ID with address count', async () => {
    const result = await queryAdapter.getById(seededData.customerUser.id);

    expect(result.isSuccess).toBe(true);
    if (!result.isSuccess) return;

    expect(result.value).not.toBeNull();
    expect(result.value?.id).toBe(seededData.customerUser.id);
    expect(result.value?.email).toBe('customer.integration@example.com');
  });

  it('returns null when querying non-existent user ID', async () => {
    const result = await queryAdapter.getById(99999);

    expect(result.isSuccess).toBe(true);
    if (!result.isSuccess) return;

    expect(result.value).toBeNull();
  });
});
