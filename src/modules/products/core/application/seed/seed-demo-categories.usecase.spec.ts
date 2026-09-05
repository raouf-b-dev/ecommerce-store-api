import { Test, TestingModule } from '@nestjs/testing';
import { SeedDemoCategoriesUseCase } from './seed-demo-categories.usecase';
import { CategoryRepository } from '../../domain/repositories/category-repository';
import { Result } from '../../../../../shared-kernel/domain/result';
import { RepositoryError } from '../../../../../shared-kernel/domain/exceptions/repository.error';
import { Category } from '../../domain/entities/category';
import { DEMO_SEED_CATEGORIES } from './demo-categories';
import { MockCategoryRepository } from '../../../testing/mocks/category-repository.mock';

describe('SeedDemoCategoriesUseCase', () => {
  let useCase: SeedDemoCategoriesUseCase;
  let categoryRepository: MockCategoryRepository;

  beforeEach(async () => {
    categoryRepository = new MockCategoryRepository();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeedDemoCategoriesUseCase,
        {
          provide: CategoryRepository,
          useValue: categoryRepository,
        },
      ],
    }).compile();

    useCase = module.get(SeedDemoCategoriesUseCase);
  });

  it('creates missing categories', async () => {
    categoryRepository.findBySlug.mockResolvedValue(Result.success(null));
    categoryRepository.mockSuccessfulSave();

    const result = await useCase.execute();

    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) {
      expect(result.value).toHaveLength(DEMO_SEED_CATEGORIES.length);
      expect(result.value.every((c) => c.status === 'created')).toBe(true);
      expect(result.value[0].slug).toBe('electronics');
    }
    expect(categoryRepository.save).toHaveBeenCalledTimes(
      DEMO_SEED_CATEGORIES.length,
    );
  });

  it('skips existing active categories without renaming', async () => {
    const existing = DEMO_SEED_CATEGORIES.map((fixture) =>
      Category.fromPrimitives({
        id: fixture.id,
        name: `Custom ${fixture.name}`,
        slug: fixture.slug,
        description: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );

    categoryRepository.findBySlug.mockImplementation(async (slug) => {
      const found = existing.find((c) => c.slug === slug) ?? null;
      return Result.success(found);
    });

    const result = await useCase.execute();

    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) {
      expect(result.value.every((c) => c.status === 'existing')).toBe(true);
      expect(result.value[0].name).toBe('Custom Electronics');
    }
    expect(categoryRepository.save).not.toHaveBeenCalled();
  });

  it('reactivates inactive categories', async () => {
    const inactive = Category.fromPrimitives({
      id: 1,
      name: 'Electronics',
      slug: 'electronics',
      description: null,
      isActive: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    const others = DEMO_SEED_CATEGORIES.slice(1).map((fixture) =>
      Category.fromPrimitives({
        id: fixture.id,
        name: fixture.name,
        slug: fixture.slug,
        description: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );

    categoryRepository.findBySlug.mockImplementation(async (slug) => {
      if (slug === 'electronics') {
        return Result.success(inactive);
      }
      const found = others.find((c) => c.slug === slug) ?? null;
      return Result.success(found);
    });
    categoryRepository.mockSuccessfulSave();

    const result = await useCase.execute();

    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) {
      expect(result.value[0].status).toBe('reactivated');
      expect(result.value.slice(1).every((c) => c.status === 'existing')).toBe(
        true,
      );
    }
    expect(categoryRepository.save).toHaveBeenCalledTimes(1);
    expect(inactive.isActive).toBe(true);
  });

  it('propagates repository lookup failure', async () => {
    categoryRepository.findBySlug.mockResolvedValue(
      Result.failure(new RepositoryError('Lookup failed')),
    );

    const result = await useCase.execute();

    expect(result.isFailure).toBe(true);
    if (result.isFailure) {
      expect(result.error.message).toContain('Failed to lookup category');
    }
  });
});
