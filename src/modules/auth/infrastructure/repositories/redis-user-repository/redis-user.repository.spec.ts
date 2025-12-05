import { Test, TestingModule } from '@nestjs/testing';
import { RedisUserRepository } from './redis-user.repository';
import { CacheService } from '../../../../../core/infrastructure/redis/cache/cache.service';
import { UserRepository } from '../../../domain/repositories/user.repository';
import { MockUserRepository } from '../../../testing/mocks/user-repository.mock';
import { UserTestFactory } from '../../../testing/factories/user.factory';
import { User } from '../../../domain/entities/user';
import { ResultAssertionHelper } from '../../../../../testing';
import { RepositoryError } from '../../../../../core/errors/repository.error';
import { UserCacheMapper } from '../../persistence/mappers/user.mapper';
import { USER_REDIS } from '../../../../../core/infrastructure/redis/constants/redis.constants';
import { Result } from '../../../../../core/domain/result';

describe('RedisUserRepository', () => {
  let repository: RedisUserRepository;
  let cacheService: jest.Mocked<CacheService>;
  let postgresRepo: MockUserRepository;

  const mockUser = User.fromPrimitives(UserTestFactory.createMockUser());
  const mockUserCache = UserCacheMapper.toCache(mockUser);

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RedisUserRepository,
        {
          provide: CacheService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            delete: jest.fn(),
            getAll: jest.fn(),
          },
        },
        {
          provide: UserRepository,
          useClass: MockUserRepository,
        },
      ],
    }).compile();

    repository = module.get<RedisUserRepository>(RedisUserRepository);
    cacheService = module.get(CacheService);
    postgresRepo = module.get(UserRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('save', () => {
    it('should save user to postgres and cache', async () => {
      postgresRepo.save.mockResolvedValue(Result.success(mockUser));

      const result = await repository.save(mockUser);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(postgresRepo.save).toHaveBeenCalledWith(mockUser);
      expect(cacheService.set).toHaveBeenCalledWith(
        expect.stringContaining(mockUser.id!),
        mockUserCache,
        expect.any(Object),
      );
      expect(cacheService.set).toHaveBeenCalledTimes(1);
    });

    it('should return failure if postgres save fails', async () => {
      postgresRepo.save.mockResolvedValue(
        Result.failure(new RepositoryError('DB Error')),
      );

      const result = await repository.save(mockUser);

      ResultAssertionHelper.assertResultFailure(
        result,
        'DB Error',
        RepositoryError,
      );
      expect(cacheService.set).not.toHaveBeenCalled();
    });
  });

  describe('findByEmail', () => {
    it('should return user from cache if available', async () => {
      cacheService.getAll.mockResolvedValue([mockUserCache]);

      const result = await repository.findByEmail(mockUser.email);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toBeDefined();
      expect(result.value!.email).toBe(mockUser.email);
      expect(postgresRepo.findByEmail).not.toHaveBeenCalled();
      expect(cacheService.getAll).toHaveBeenCalledWith(
        USER_REDIS.INDEX,
        `@email:"${mockUser.email}"`,
      );
    });

    it('should return user from postgres if not in cache', async () => {
      cacheService.getAll.mockResolvedValue([]);
      postgresRepo.findByEmail.mockResolvedValue(Result.success(mockUser));

      const result = await repository.findByEmail(mockUser.email);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toBeDefined();
      expect(result.value!.email).toBe(mockUser.email);
      expect(cacheService.set).toHaveBeenCalledWith(
        expect.stringContaining(mockUser.id!),
        mockUserCache,
        expect.any(Object),
      );
    });

    it('should return null if not found in postgres', async () => {
      cacheService.getAll.mockResolvedValue([]);
      postgresRepo.findByEmail.mockResolvedValue(Result.success(null));

      const result = await repository.findByEmail('notfound@example.com');

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toBeNull();
    });
  });

  describe('findById', () => {
    it('should return user from cache if available', async () => {
      cacheService.get.mockResolvedValue(mockUserCache);

      const result = await repository.findById(mockUser.id!);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toBeDefined();
      expect(result.value!.id).toBe(mockUser.id);
      expect(postgresRepo.findById).not.toHaveBeenCalled();
    });

    it('should return user from postgres if not in cache', async () => {
      cacheService.get.mockResolvedValue(null);
      postgresRepo.findById.mockResolvedValue(Result.success(mockUser));

      const result = await repository.findById(mockUser.id!);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toBeDefined();
      expect(result.value!.id).toBe(mockUser.id);
      expect(cacheService.set).toHaveBeenCalledWith(
        expect.stringContaining(mockUser.id!),
        mockUserCache,
        expect.any(Object),
      );
      expect(cacheService.set).toHaveBeenCalledTimes(1);
    });
  });

  describe('delete', () => {
    it('should delete user from cache and postgres', async () => {
      postgresRepo.delete.mockResolvedValue(Result.success(undefined));

      const result = await repository.delete(mockUser.id!);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(cacheService.delete).toHaveBeenCalledWith(
        expect.stringContaining(mockUser.id!),
      );
      expect(postgresRepo.delete).toHaveBeenCalledWith(mockUser.id);
    });
  });
});
