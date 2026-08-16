import { Credential } from '../../../core/domain/entities/credential';
import { PostgresCredentialRepository } from './postgres-credential.repository';
import { CredentialEntity } from '../../orm/credential.schema';
import { IntegrationTestHelper } from 'test/integration/harness/integration-test.helper';
import { SeededData } from 'test/integration/harness/seed-reference-data';
import { ResultAssertionHelper } from 'src/testing';

describe('PostgresCredentialRepository (Integration - Real DB)', () => {
  let repository: PostgresCredentialRepository;
  let seededData: SeededData;

  beforeEach(async () => {
    await IntegrationTestHelper.clearDatabase();
    seededData = await IntegrationTestHelper.seedReferenceData();

    const dataSource = IntegrationTestHelper.getDataSource();
    repository = new PostgresCredentialRepository(
      dataSource.getRepository(CredentialEntity),
    );
  });

  it('save persists a credential and findByUserId round-trips it', async () => {
    const credential = Credential.create({
      userId: seededData.customerUser.id,
      passwordHash: 'hash-customer-1',
      mustChangePassword: false,
    });

    const saveResult = await repository.save(credential);
    ResultAssertionHelper.assertResultSuccess(saveResult);

    const found = await repository.findByUserId(seededData.customerUser.id);
    ResultAssertionHelper.assertResultSuccess(found);
    expect(found.value?.passwordHash).toBe('hash-customer-1');
  });

  it('save rejects a second credential for the same userId', async () => {
    await repository.save(
      Credential.create({
        userId: seededData.customerUser.id,
        passwordHash: 'hash-a',
        mustChangePassword: false,
      }),
    );

    const duplicate = await repository.save(
      Credential.create({
        userId: seededData.customerUser.id,
        passwordHash: 'hash-b',
        mustChangePassword: false,
      }),
    );

    ResultAssertionHelper.assertResultFailure(
      duplicate,
      'Failed to save credential',
    );
  });
});
