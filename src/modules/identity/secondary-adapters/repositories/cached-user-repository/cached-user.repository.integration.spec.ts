import { CachedUserRepository } from './cached-user.repository';
import { PostgresUserRepository } from '../postgres-user-repository/postgres-user.repository';
import { UserEntity } from '../../orm/user.schema';
import {
  UserCacheMapper,
  UserForCache,
} from '../../persistence/mappers/user.mapper';
import { IntegrationTestHelper } from 'test/integration/setup/integration-test.helper';
import { SeededData } from 'test/integration/setup/seed-reference-data';
import { MockCacheService } from 'src/testing';
import { USER_REDIS } from 'src/infrastructure/redis/constants/redis.constants';
import { ResultAssertionHelper } from 'src/testing';

describe('CachedUserRepository (Integration - Real DB delegate)', () => {
  let repository: CachedUserRepository;
  let cacheService: MockCacheService;
  let seededData: SeededData;

  const idKey = (id: number) => `${USER_REDIS.CACHE_KEY}:${id}`;

  beforeEach(async () => {
    await IntegrationTestHelper.clearDatabase();
    seededData = await IntegrationTestHelper.seedReferenceData();

    const dataSource = IntegrationTestHelper.getDataSource();
    const postgresRepo = new PostgresUserRepository(
      dataSource.getRepository(UserEntity),
    );
    cacheService = new MockCacheService();
    repository = new CachedUserRepository(cacheService, postgresRepo);
  });

  it('loads from postgres on cache miss and populates the id key', async () => {
    cacheService.get.mockResolvedValue(null);

    const result = await repository.findById(seededData.customerUser.id);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value?.id).toBe(seededData.customerUser.id);
    expect(cacheService.set).toHaveBeenCalledWith(
      idKey(seededData.customerUser.id),
      expect.any(Object),
      { ttl: USER_REDIS.EXPIRATION },
    );
  });

  it('returns the cached user on cache hit', async () => {
    const postgresRepo = new PostgresUserRepository(
      IntegrationTestHelper.getDataSource().getRepository(UserEntity),
    );
    const loaded = await postgresRepo.findById(seededData.customerUser.id);
    ResultAssertionHelper.assertResultSuccess(loaded);
    const cached: UserForCache = UserCacheMapper.toCache(loaded.value!);
    cacheService.get.mockResolvedValue(cached);

    const result = await repository.findById(seededData.customerUser.id);

    ResultAssertionHelper.assertResultSuccess(result);
    expect(result.value?.email).toBe(seededData.customerUser.email);
    expect(cacheService.set).not.toHaveBeenCalled();
  });
});
