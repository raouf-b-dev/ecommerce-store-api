import { UserTestFactory } from 'src/modules/identity/testing';
import { HttpStatus } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { PostgresUserRepository } from './postgres-user.repository';
import { UserEntity } from '../../orm/user.schema';
import { User } from '../../../core/domain/entities/user';
import { ResultAssertionHelper } from '../../../../../testing';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import { UserMapper } from '../../persistence/mappers/user.mapper';
import {
  createMockDataSource,
  createMockQueryBuilder,
  createMockTransactionManager,
} from '../../../../../testing/mocks/typeorm.mocks';

describe('PostgresUserRepository', () => {
  let repository: PostgresUserRepository;
  let typeOrmRepository: jest.Mocked<Repository<UserEntity>>;
  let mockQueryBuilder: ReturnType<typeof createMockQueryBuilder<UserEntity>>;
  let mockTransactionManager: ReturnType<typeof createMockTransactionManager>;

  const mockUser = User.fromProps(UserTestFactory.createMockUser());
  const mockUserEntity = UserMapper.toEntity(mockUser);

  beforeEach(async () => {
    mockQueryBuilder = createMockQueryBuilder<UserEntity>();
    mockTransactionManager = createMockTransactionManager({
      mockQueryBuilder,
    });
    const mockDataSource = createMockDataSource(mockTransactionManager);

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PostgresUserRepository,
        {
          provide: getRepositoryToken(UserEntity),
          useValue: {
            save: jest.fn(),
            findOne: jest.fn(),
            delete: jest.fn(),
          },
        },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    repository = module.get<PostgresUserRepository>(PostgresUserRepository);
    typeOrmRepository = module.get(getRepositoryToken(UserEntity));
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('save', () => {
    it('should save a new user successfully', async () => {
      typeOrmRepository.save.mockResolvedValue({
        ...mockUserEntity,
        id: 1,
      });

      const newUser = User.fromProps(UserTestFactory.createMockUser());
      const result = await repository.save(newUser);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(typeOrmRepository.save).toHaveBeenCalled();
    });

    it('should update an existing user successfully', async () => {
      typeOrmRepository.save.mockResolvedValue(mockUserEntity);

      const result = await repository.save(mockUser);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(typeOrmRepository.save).toHaveBeenCalled();
    });

    it('should OCC-update with WHERE version when expectedVersion is provided', async () => {
      mockQueryBuilder.execute.mockResolvedValue({ raw: [], affected: 1 });
      mockTransactionManager.find.mockResolvedValue([]);
      typeOrmRepository.findOne.mockResolvedValue(mockUserEntity);

      const result = await repository.save(mockUser, 1);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(typeOrmRepository.save).not.toHaveBeenCalled();
      expect(mockQueryBuilder.update).toHaveBeenCalledWith(UserEntity);
      expect(mockQueryBuilder.where).toHaveBeenCalledWith(
        'id = :id AND version = :expectedVersion',
        { id: mockUser.id, expectedVersion: 1 },
      );
    });

    it('should return conflict when OCC update affects 0 rows and the user exists', async () => {
      mockQueryBuilder.execute.mockResolvedValue({ raw: [], affected: 0 });
      mockTransactionManager.findOne.mockResolvedValue(mockUserEntity);

      const result = await repository.save(mockUser, 1);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Optimistic lock failure',
        RepositoryError,
      );
      if (result.isFailure) {
        expect(result.error.statusCode).toBe(HttpStatus.CONFLICT);
      }
    });

    it('should return not-found when OCC update affects 0 rows and the user is missing', async () => {
      mockQueryBuilder.execute.mockResolvedValue({ raw: [], affected: 0 });
      mockTransactionManager.findOne.mockResolvedValue(null);

      const result = await repository.save(mockUser, 1);

      ResultAssertionHelper.assertResultFailure(
        result,
        'User not found',
        RepositoryError,
      );
    });

    it('should return failure if save fails', async () => {
      typeOrmRepository.save.mockRejectedValue(new Error('DB Error'));

      const result = await repository.save(mockUser);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to save user',
        RepositoryError,
      );
    });
  });

  describe('findByEmail', () => {
    it('should return user if found', async () => {
      typeOrmRepository.findOne.mockResolvedValue(mockUserEntity);

      const result = await repository.findByEmail(mockUser.email);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toBeDefined();
      expect(result.value!.email).toBe(mockUser.email);
    });

    it('should return null if user not found', async () => {
      typeOrmRepository.findOne.mockResolvedValue(null);

      const result = await repository.findByEmail('notfound@example.com');

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toBeNull();
    });

    it('should return failure if findOne fails', async () => {
      typeOrmRepository.findOne.mockRejectedValue(new Error('DB Error'));

      const result = await repository.findByEmail(mockUser.email);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to find user by email',
        RepositoryError,
      );
    });
  });

  describe('findById', () => {
    it('should return user if found', async () => {
      typeOrmRepository.findOne.mockResolvedValue(mockUserEntity);

      const result = await repository.findById(mockUser.id!);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toBeDefined();
      expect(result.value!.id).toBe(mockUser.id);
    });

    it('should return null if user not found', async () => {
      typeOrmRepository.findOne.mockResolvedValue(null);

      const result = await repository.findById(999);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toBeNull();
    });

    it('should return failure if findOne fails', async () => {
      typeOrmRepository.findOne.mockRejectedValue(new Error('DB Error'));

      const result = await repository.findById(mockUser.id!);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to find user by id',
        RepositoryError,
      );
    });
  });

  describe('delete', () => {
    it('should delete user successfully', async () => {
      typeOrmRepository.delete.mockResolvedValue({ raw: [], affected: 1 });

      const result = await repository.delete(mockUser.id!);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(typeOrmRepository.delete).toHaveBeenCalledWith(mockUser.id);
    });

    it('should return failure if delete fails', async () => {
      typeOrmRepository.delete.mockRejectedValue(new Error('DB Error'));

      const result = await repository.delete(mockUser.id!);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to delete user',
        RepositoryError,
      );
    });
  });
});
