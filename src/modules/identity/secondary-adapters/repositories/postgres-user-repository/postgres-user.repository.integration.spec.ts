import { User } from '../../../core/domain/entities/user';
import { PostgresUserRepository } from './postgres-user.repository';
import { UserEntity } from '../../orm/user.schema';
import { AddressEntity } from '../../orm/address.schema';
import { IntegrationTestHelper } from 'test/integration/harness/integration-test.helper';
import { SeededData } from 'test/integration/harness/seed-reference-data';
import { ResultAssertionHelper } from 'src/testing';
import { AddressType } from '../../../../../shared-kernel/domain/value-objects/address-type';

describe('PostgresUserRepository (Integration - Real DB)', () => {
  let repository: PostgresUserRepository;
  let seededData: SeededData;

  beforeEach(async () => {
    await IntegrationTestHelper.clearDatabase();
    seededData = await IntegrationTestHelper.seedReferenceData();

    const dataSource = IntegrationTestHelper.getDataSource();
    repository = new PostgresUserRepository(
      dataSource.getRepository(UserEntity),
      dataSource,
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

  it('save with expectedVersion persists a new address and increments version', async () => {
    const forUpdate = await repository.findByIdForUpdate(
      seededData.customerUser.id,
    );
    ResultAssertionHelper.assertResultSuccess(forUpdate);
    const user = forUpdate.value!.entity;

    ResultAssertionHelper.assertResultSuccess(
      user.addAddress({
        id: null,
        userId: user.id!,
        street: '10 Integration Way',
        street2: null,
        city: 'Algiers',
        state: 'Algiers',
        postalCode: '16000',
        country: 'DZ',
        type: AddressType.HOME,
        isDefault: true,
        deliveryInstructions: null,
        createdAt: null,
        updatedAt: null,
      }),
    );

    const saveResult = await repository.save(
      user,
      forUpdate.value!.expectedVersion,
    );
    ResultAssertionHelper.assertResultSuccess(saveResult);

    const loaded = await repository.findById(seededData.customerUser.id);
    ResultAssertionHelper.assertResultSuccess(loaded);
    expect(loaded.value!.addresses).toHaveLength(1);
    expect(loaded.value!.addresses[0].street).toBe('10 Integration Way');

    const after = await repository.findByIdForUpdate(
      seededData.customerUser.id,
    );
    ResultAssertionHelper.assertResultSuccess(after);
    expect(after.value!.expectedVersion).toBeGreaterThan(
      forUpdate.value!.expectedVersion,
    );
  });

  it('save with stale expectedVersion does not persist a new address', async () => {
    const forUpdate = await repository.findByIdForUpdate(
      seededData.customerUser.id,
    );
    ResultAssertionHelper.assertResultSuccess(forUpdate);
    const user = forUpdate.value!.entity;

    ResultAssertionHelper.assertResultSuccess(
      user.updatePersonalInfo('Locked', user.lastName, user.email, user.phone),
    );

    const firstSave = await repository.save(
      user,
      forUpdate.value!.expectedVersion,
    );
    ResultAssertionHelper.assertResultSuccess(firstSave);

    ResultAssertionHelper.assertResultSuccess(
      user.addAddress({
        id: null,
        userId: user.id!,
        street: 'Should Not Persist',
        street2: null,
        city: 'Algiers',
        state: 'Algiers',
        postalCode: '16000',
        country: 'DZ',
        type: AddressType.WORK,
        isDefault: false,
        deliveryInstructions: null,
        createdAt: null,
        updatedAt: null,
      }),
    );

    const staleSave = await repository.save(
      user,
      forUpdate.value!.expectedVersion,
    );
    ResultAssertionHelper.assertResultFailure(
      staleSave,
      'Optimistic lock failure',
    );

    const addressCount = await IntegrationTestHelper.getRepository(
      AddressEntity,
    ).count({ where: { userId: seededData.customerUser.id } });
    expect(addressCount).toBe(0);

    const loaded = await repository.findById(seededData.customerUser.id);
    ResultAssertionHelper.assertResultSuccess(loaded);
    expect(loaded.value!.firstName).toBe('Locked');
  });
});
