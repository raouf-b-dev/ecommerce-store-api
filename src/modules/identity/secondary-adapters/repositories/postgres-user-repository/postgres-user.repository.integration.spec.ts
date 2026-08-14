import { User } from '../../../core/domain/entities/user';
import { PostgresUserRepository } from './postgres-user.repository';
import { UserEntity } from '../../orm/user.schema';
import { IntegrationTestHelper } from 'test/integration/setup/integration-test.helper';
import { SeededData } from 'test/integration/setup/seed-reference-data';
import { ResultAssertionHelper } from 'src/testing';

describe('PostgresUserRepository (Integration - Real DB)', () => {
  let repository: PostgresUserRepository;
  let seededData: SeededData;

  beforeEach(async () => {
    await IntegrationTestHelper.clearDatabase();
    seededData = await IntegrationTestHelper.seedReferenceData();

    const dataSource = IntegrationTestHelper.getDataSource();
    repository = new PostgresUserRepository(
      dataSource.getRepository(UserEntity),
    );
  });

  const newUser = (email: string): User =>
    new User({
      id: null,
      firstName: 'New',
      lastName: 'Customer',
      email,
      phone: null,
      isActive: true,
      addresses: [],
      createdAt: new Date(),
      updatedAt: new Date(),
    });

  it('findByEmail returns the seeded customer', async () => {
    const result = await repository.findByEmail(seededData.customerUser.email);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value?.id).toBe(seededData.customerUser.id);
  });

  it('save persists a new user and findById round-trips it', async () => {
    const saveResult = await repository.save(newUser('fresh.user@example.com'));
    ResultAssertionHelper.assertResultSuccess(saveResult);
    expect(saveResult.value.id).toBeDefined();

    const found = await repository.findById(saveResult.value.id!);
    ResultAssertionHelper.assertResultSuccess(found);
    expect(found.value?.email).toBe('fresh.user@example.com');
  });

  it('save rejects a duplicate email at the unique constraint', async () => {
    const result = await repository.save(
      newUser(seededData.customerUser.email),
    );

    ResultAssertionHelper.assertResultFailure(result, 'Failed to save user');
  });

  it('findByIdForUpdate returns expectedVersion', async () => {
    const result = await repository.findByIdForUpdate(
      seededData.customerUser.id,
    );

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value?.entity.id).toBe(seededData.customerUser.id);
    expect(result.value?.expectedVersion).toBeGreaterThanOrEqual(1);
  });
});
