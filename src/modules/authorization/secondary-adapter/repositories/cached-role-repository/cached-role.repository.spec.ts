import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { MockRoleRepository } from 'src/modules/authorization/testing';
import {
  MockCacheService,
  MockLogger,
  ResultAssertionHelper,
} from 'src/testing';
import { CachePort } from '../../../../../shared-kernel/domain/interfaces/cache.port';
import { Result } from '../../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import {
  AUTHORIZATION_REDIS,
  rolePermissionsCacheKey,
} from '../../../../../infrastructure/redis/constants/redis.constants';
import { RoleRepository } from '../../../core/domain/repositories/role.repository';
import { AuthorizationDtoFactory } from '../../../testing/factories/authorization.dto.factory';
import { CachedRoleRepository } from './cached-role.repository';

describe('CachedRoleRepository', () => {
  let repository: CachedRoleRepository;
  let cacheService: MockCacheService;
  let postgresRepo: MockRoleRepository;

  const role = AuthorizationDtoFactory.buildEntity({
    code: 'ADMIN',
    permissions: ['manage_products'],
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CachedRoleRepository,
        { provide: CachePort, useValue: new MockCacheService() },
        { provide: RoleRepository, useValue: new MockRoleRepository() },
        { provide: Logger, useValue: new MockLogger() },
      ],
    }).compile();

    repository = module.get(CachedRoleRepository);
    cacheService = module.get(CachePort);
    postgresRepo = module.get(RoleRepository);
  });

  afterEach(() => jest.clearAllMocks());

  describe('findPermissionCodesByRoleCode', () => {
    it('should return cached permission codes without hitting Postgres', async () => {
      cacheService.isAvailable.mockReturnValue(true);
      cacheService.get.mockResolvedValue(['manage_products']);

      const result = await repository.findPermissionCodesByRoleCode('ADMIN');

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual(['manage_products']);
      expect(postgresRepo.findPermissionCodesByRoleCode).not.toHaveBeenCalled();
    });

    it('should load from Postgres and cache permission codes on miss', async () => {
      cacheService.isAvailable.mockReturnValue(true);
      cacheService.get.mockResolvedValue(null);
      cacheService.set.mockResolvedValue(true);
      postgresRepo.findPermissionCodesByRoleCode.mockResolvedValue(
        Result.success(['manage_products', 'manage_users']),
      );

      const result = await repository.findPermissionCodesByRoleCode('ADMIN');

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual(['manage_products', 'manage_users']);
      expect(cacheService.set).toHaveBeenCalledWith(
        rolePermissionsCacheKey('ADMIN'),
        ['manage_products', 'manage_users'],
        { ttl: AUTHORIZATION_REDIS.EXPIRATION },
      );
    });

    it('should cache empty array when role is missing', async () => {
      cacheService.isAvailable.mockReturnValue(true);
      cacheService.get.mockResolvedValue(null);
      cacheService.set.mockResolvedValue(true);
      postgresRepo.findPermissionCodesByRoleCode.mockResolvedValue(
        Result.success(null),
      );

      const result = await repository.findPermissionCodesByRoleCode('UNKNOWN');

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toBeNull();
      expect(cacheService.set).toHaveBeenCalledWith(
        rolePermissionsCacheKey('UNKNOWN'),
        [],
        { ttl: AUTHORIZATION_REDIS.EXPIRATION },
      );
    });

    it('should fall back to Postgres when cache read fails', async () => {
      cacheService.isAvailable.mockReturnValue(true);
      cacheService.get.mockRejectedValue(new Error('Redis down'));
      postgresRepo.findPermissionCodesByRoleCode.mockResolvedValue(
        Result.success(['manage_products']),
      );

      const result = await repository.findPermissionCodesByRoleCode('ADMIN');

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual(['manage_products']);
      expect(postgresRepo.findPermissionCodesByRoleCode).toHaveBeenCalledWith(
        'ADMIN',
      );
    });

    it('should propagate repository failures', async () => {
      const error = new RepositoryError('DB error');
      cacheService.isAvailable.mockReturnValue(true);
      cacheService.get.mockResolvedValue(null);
      postgresRepo.findPermissionCodesByRoleCode.mockResolvedValue(
        Result.failure(error),
      );

      const result = await repository.findPermissionCodesByRoleCode('ADMIN');

      ResultAssertionHelper.assertResultFailureWithError(result, error);
      expect(cacheService.set).not.toHaveBeenCalled();
    });
  });

  describe('mutations', () => {
    beforeEach(() => {
      cacheService.isAvailable.mockReturnValue(true);
      cacheService.delete.mockResolvedValue(undefined);
    });

    it('should invalidate permission cache after save', async () => {
      postgresRepo.save.mockResolvedValue(Result.success(role));

      await repository.save(role);

      expect(cacheService.delete).toHaveBeenCalledWith(
        rolePermissionsCacheKey(role.code),
      );
    });

    it('should invalidate permission cache after update', async () => {
      postgresRepo.update.mockResolvedValue(Result.success(undefined));

      await repository.update(role);

      expect(cacheService.delete).toHaveBeenCalledWith(
        rolePermissionsCacheKey(role.code),
      );
    });

    it('should invalidate permission cache after delete', async () => {
      postgresRepo.findById.mockResolvedValue(Result.success(role));
      postgresRepo.delete.mockResolvedValue(Result.success(undefined));

      await repository.delete(role.id);

      expect(cacheService.delete).toHaveBeenCalledWith(
        rolePermissionsCacheKey(role.code),
      );
    });

    it('should invalidate each role after saveMany', async () => {
      const roles = [
        AuthorizationDtoFactory.buildEntity({ code: 'ADMIN' }),
        AuthorizationDtoFactory.buildEntity({ code: 'MANAGER' }),
      ];
      postgresRepo.saveMany.mockResolvedValue(Result.success(roles));

      await repository.saveMany(roles);

      expect(cacheService.delete).toHaveBeenCalledWith(
        rolePermissionsCacheKey('ADMIN'),
      );
      expect(cacheService.delete).toHaveBeenCalledWith(
        rolePermissionsCacheKey('MANAGER'),
      );
    });
  });
});
