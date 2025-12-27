import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PostgresUserRepository } from './postgres-user.repository';
import { UserEntity } from '../../orm/user.schema';
import { UserTestFactory } from '../../../testing/factories/user.factory';
import { User } from '../../../domain/entities/user';
import { ResultAssertionHelper } from '../../../../../testing';
import { RepositoryError } from '../../../../../core/errors/repository.error';
import { UserMapper } from '../../persistence/mappers/user.mapper';

describe('PostgresUserRepository', () => {
  let repository: PostgresUserRepository;
  let typeOrmRepository: jest.Mocked<Repository<UserEntity>>;

  const mockUser = User.fromPrimitives(UserTestFactory.createMockUser());
  const mockUserEntity = UserMapper.toEntity(mockUser);

  beforeEach(async () => {
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

      const newUser = User.create(null, 'test@example.com', 'hash');
      const result = await repository.save(newUser);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.id).toBe(1);
      expect(typeOrmRepository.save).toHaveBeenCalled();
    });

    it('should update an existing user successfully', async () => {
      typeOrmRepository.save.mockResolvedValue(mockUserEntity);

      const result = await repository.save(mockUser);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.id).toBe(mockUser.id);
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
