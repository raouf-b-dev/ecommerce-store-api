import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { PostgresCategoryRepository } from './postgres.category-repository';
import { CategoryEntity } from '../../orm/category.schema';
import { Category } from '../../../core/domain/entities/category';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import { ResultAssertionHelper } from '../../../../../testing';

describe('PostgresCategoryRepository', () => {
  let repository: PostgresCategoryRepository;
  let ormRepo: jest.Mocked<Repository<CategoryEntity>>;

  const mockEntity: CategoryEntity = {
    id: 1,
    name: 'Electronics',
    slug: 'electronics',
    description: null,
    isActive: true,
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  };

  beforeEach(async () => {
    const mockOrmRepo = {
      save: jest.fn(),
      findOne: jest.fn(),
      find: jest.fn(),
      delete: jest.fn(),
    };

    const testingModule: TestingModule = await Test.createTestingModule({
      providers: [
        PostgresCategoryRepository,
        {
          provide: getRepositoryToken(CategoryEntity),
          useValue: mockOrmRepo,
        },
      ],
    }).compile();

    repository = testingModule.get(PostgresCategoryRepository);
    ormRepo = testingModule.get(getRepositoryToken(CategoryEntity));
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findById', () => {
    it('returns the mapped category', async () => {
      ormRepo.findOne.mockResolvedValue(mockEntity);

      const result = await repository.findById(1);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value?.name).toBe('Electronics');
    });

    it('returns success with null when missing', async () => {
      ormRepo.findOne.mockResolvedValue(null);

      const result = await repository.findById(99);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toBeNull();
    });

    it('returns failure when the query throws', async () => {
      ormRepo.findOne.mockRejectedValue(new Error('db down'));

      const result = await repository.findById(1);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to find the category',
        RepositoryError,
      );
    });
  });

  describe('findBySlug', () => {
    it('returns the mapped category', async () => {
      ormRepo.findOne.mockResolvedValue(mockEntity);

      const result = await repository.findBySlug('electronics');

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value?.id).toBe(1);
    });
  });

  describe('findAll', () => {
    it('returns mapped categories ordered by id', async () => {
      ormRepo.find.mockResolvedValue([mockEntity]);

      const result = await repository.findAll({ isActive: true });

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toHaveLength(1);
      expect(ormRepo.find).toHaveBeenCalledWith({
        where: { isActive: true },
        order: { id: 'ASC' },
      });
    });
  });

  describe('save', () => {
    it('persists and assigns the generated id', async () => {
      const category = Category.create({ name: 'Electronics' });
      ormRepo.save.mockResolvedValue({ ...mockEntity, id: 8 });

      const result = await repository.save(category);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.id).toBe(8);
    });

    it('returns failure when save throws', async () => {
      const category = Category.create({ name: 'Electronics' });
      ormRepo.save.mockRejectedValue(new Error('unique'));

      const result = await repository.save(category);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to save the category',
        RepositoryError,
      );
    });
  });

  describe('deleteById', () => {
    it('deletes the category', async () => {
      ormRepo.delete.mockResolvedValue({ raw: [], affected: 1 });

      const result = await repository.deleteById(1);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(ormRepo.delete).toHaveBeenCalledWith(1);
    });

    it('returns failure when delete throws', async () => {
      ormRepo.delete.mockRejectedValue(new Error('db down'));

      const result = await repository.deleteById(1);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to delete the category',
        RepositoryError,
      );
    });
  });

  describe('existsByName', () => {
    it('returns true when another row matches', async () => {
      ormRepo.findOne.mockResolvedValue(mockEntity);

      const result = await repository.existsByName('Electronics');

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toBe(true);
      expect(ormRepo.findOne).toHaveBeenCalledWith({
        where: { name: 'Electronics' },
      });
    });

    it('excludes the given id with TypeORM Not', async () => {
      ormRepo.findOne.mockResolvedValue(null);

      const result = await repository.existsByName('Electronics', 1);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toBe(false);
      expect(ormRepo.findOne).toHaveBeenCalledWith({
        where: { name: 'Electronics', id: Not(1) },
      });
    });
  });

  describe('existsBySlug', () => {
    it('excludes the given id with TypeORM Not', async () => {
      ormRepo.findOne.mockResolvedValue(mockEntity);

      const result = await repository.existsBySlug('electronics', 2);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toBe(true);
      expect(ormRepo.findOne).toHaveBeenCalledWith({
        where: { slug: 'electronics', id: Not(2) },
      });
    });

    it('returns failure when the query throws', async () => {
      ormRepo.findOne.mockRejectedValue(new Error('db down'));

      const result = await repository.existsBySlug('electronics');

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to check category slug uniqueness',
        RepositoryError,
      );
    });
  });
});
