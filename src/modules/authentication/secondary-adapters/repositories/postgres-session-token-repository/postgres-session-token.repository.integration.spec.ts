import { SessionToken } from '../../../core/domain/entities/session-token';
import { PostgresSessionTokenRepository } from './postgres-session-token.repository';
import { SessionTokenEntity } from '../../orm/session-token.schema';
import { IntegrationTestHelper } from 'test/integration/setup/integration-test.helper';
import { SeededData } from 'test/integration/setup/seed-reference-data';
import { ResultAssertionHelper } from 'src/testing';

describe('PostgresSessionTokenRepository (Integration - Real DB)', () => {
  let repository: PostgresSessionTokenRepository;
  let seededData: SeededData;

  beforeEach(async () => {
    await IntegrationTestHelper.clearDatabase();
    seededData = await IntegrationTestHelper.seedReferenceData();

    const dataSource = IntegrationTestHelper.getDataSource();
    repository = new PostgresSessionTokenRepository(
      dataSource.getRepository(SessionTokenEntity),
    );
  });

  it('save persists a session token and findById returns it', async () => {
    const token = SessionToken.create(
      seededData.customerUser.id,
      'raw-session-token',
      new Date(Date.now() + 60_000),
    );

    const saveResult = await repository.save(token);
    ResultAssertionHelper.assertResultSuccess(saveResult);

    const found = await repository.findById(token.id);
    ResultAssertionHelper.assertResultSuccess(found);
    expect(found.value?.userId).toBe(seededData.customerUser.id);
    expect(found.value?.isRevoked).toBe(false);
  });

  it('revokeAllForUser marks every active session for that user as revoked', async () => {
    const first = SessionToken.create(
      seededData.customerUser.id,
      'token-one',
      new Date(Date.now() + 60_000),
    );
    const second = SessionToken.create(
      seededData.customerUser.id,
      'token-two',
      new Date(Date.now() + 60_000),
    );
    const adminToken = SessionToken.create(
      seededData.adminUser.id,
      'token-admin',
      new Date(Date.now() + 60_000),
    );

    await repository.save(first);
    await repository.save(second);
    await repository.save(adminToken);

    const revokeResult = await repository.revokeAllForUser(
      seededData.customerUser.id,
    );
    ResultAssertionHelper.assertResultSuccess(revokeResult);

    const firstLoaded = await repository.findById(first.id);
    const secondLoaded = await repository.findById(second.id);
    const adminLoaded = await repository.findById(adminToken.id);

    ResultAssertionHelper.assertResultSuccess(firstLoaded);
    ResultAssertionHelper.assertResultSuccess(secondLoaded);
    ResultAssertionHelper.assertResultSuccess(adminLoaded);
    expect(firstLoaded.value?.isRevoked).toBe(true);
    expect(secondLoaded.value?.isRevoked).toBe(true);
    expect(adminLoaded.value?.isRevoked).toBe(false);
  });
});
