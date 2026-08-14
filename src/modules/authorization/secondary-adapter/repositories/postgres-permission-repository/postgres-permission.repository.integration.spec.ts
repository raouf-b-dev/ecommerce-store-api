import { Permission } from '../../../core/domain/entities/permission';
import { PostgresPermissionRepository } from './postgres-permission.repository';
import { PermissionEntity } from '../../orm/permission.schema';
import { IntegrationTestHelper } from 'test/integration/setup/integration-test.helper';
import { ResultAssertionHelper } from 'src/testing';

describe('PostgresPermissionRepository (Integration - Real DB)', () => {
  let repository: PostgresPermissionRepository;

  beforeEach(async () => {
    await IntegrationTestHelper.clearDatabase();
    await IntegrationTestHelper.seedReferenceData();

    const dataSource = IntegrationTestHelper.getDataSource();
    repository = new PostgresPermissionRepository(
      dataSource.getRepository(PermissionEntity),
    );
  });

  it('saveMany persists permissions and findByCode / findAll round-trip them', async () => {
    const saveResult = await repository.saveMany([
      new Permission({
        id: 0,
        code: 'orders.read',
        description: 'Read orders',
      }),
      new Permission({
        id: 0,
        code: 'orders.write',
        description: 'Write orders',
      }),
    ]);
    ResultAssertionHelper.assertResultSuccess(saveResult);
    expect(saveResult.value).toHaveLength(2);

    const byCode = await repository.findByCode('orders.read');
    ResultAssertionHelper.assertResultSuccess(byCode);
    expect(byCode.value?.description).toBe('Read orders');

    const all = await repository.findAll();
    ResultAssertionHelper.assertResultSuccess(all);
    expect(all.value.map((p) => p.code)).toEqual([
      'orders.read',
      'orders.write',
    ]);
  });

  it('saveMany rejects a duplicate permission code', async () => {
    await repository.saveMany([
      new Permission({ id: 0, code: 'orders.read', description: null }),
    ]);

    const duplicate = await repository.saveMany([
      new Permission({ id: 0, code: 'orders.read', description: 'again' }),
    ]);

    ResultAssertionHelper.assertResultFailure(
      duplicate,
      'Failed to save permissions',
    );
  });
});
