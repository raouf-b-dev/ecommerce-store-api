import { Test, TestingModule } from '@nestjs/testing';
import { SeedDemoCatalogUseCase } from './seed-demo-catalog.usecase';
import { CreateProductUseCase } from '../usecases/create-product/create-product.usecase';
import { UpdateProductUseCase } from '../usecases/update-product/update-product.usecase';
import { CategoryRepository } from '../../domain/repositories/category-repository';
import { ProductRepository } from '../../domain/repositories/product-repository';
import { Result } from '../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../shared-kernel/domain/exceptions/usecase.error';
import { DEMO_SEED_PRODUCTS } from './demo-products';
import { DEMO_SEED_CATEGORIES } from './demo-categories';
import { IProduct } from '../../domain/interfaces/product.interface';
import { CreateProductCommand } from '../commands/create-product.command';
import { Category } from '../../domain/entities/category';
import { Product } from '../../domain/entities/product';
import { MockCategoryRepository } from '../../../testing/mocks/category-repository.mock';
import { MockProductRepository } from '../../../testing/mocks/product-repository.mock';

function activeCategories(): Category[] {
  return DEMO_SEED_CATEGORIES.map((fixture) =>
    Category.fromPrimitives({
      id: fixture.id,
      name: fixture.name,
      slug: fixture.slug,
      description: fixture.description,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    }),
  );
}

describe('SeedDemoCatalogUseCase', () => {
  let useCase: SeedDemoCatalogUseCase;
  let productRepository: MockProductRepository;
  let categoryRepository: MockCategoryRepository;
  let createProductUseCase: jest.Mocked<CreateProductUseCase>;
  let updateProductUseCase: jest.Mocked<UpdateProductUseCase>;

  beforeEach(async () => {
    productRepository = new MockProductRepository();
    categoryRepository = new MockCategoryRepository();
    const mockCreateUseCase = {
      execute: jest.fn(),
    };
    const mockUpdateUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeedDemoCatalogUseCase,
        {
          provide: ProductRepository,
          useValue: productRepository,
        },
        {
          provide: CategoryRepository,
          useValue: categoryRepository,
        },
        {
          provide: CreateProductUseCase,
          useValue: mockCreateUseCase,
        },
        {
          provide: UpdateProductUseCase,
          useValue: mockUpdateUseCase,
        },
      ],
    }).compile();

    useCase = module.get(SeedDemoCatalogUseCase);
    createProductUseCase = module.get(CreateProductUseCase);
    updateProductUseCase = module.get(UpdateProductUseCase);

    categoryRepository.mockSuccessfulFindAll(activeCategories());
  });

  it('should seed missing catalog products and return them', async () => {
    productRepository.mockSuccessfulList([]);
    createProductUseCase.execute.mockImplementation(
      (cmd: CreateProductCommand) =>
        Promise.resolve(
          Result.success({
            id: 100 + (cmd.sku?.length ?? 0),
            sku: cmd.sku ?? '',
            name: cmd.name,
            description: cmd.description,
            price: cmd.price,
          } as IProduct),
        ),
    );

    const result = await useCase.execute();

    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) {
      expect(result.value.length).toBe(DEMO_SEED_PRODUCTS.length);
      expect(result.value[0].status).toBe('created');
    }
    expect(createProductUseCase.execute).toHaveBeenCalledTimes(
      DEMO_SEED_PRODUCTS.length,
    );
    expect(updateProductUseCase.execute).not.toHaveBeenCalled();
    expect(createProductUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ sku: 'ELEC-ANC-001', categoryId: 1 }),
    );
    expect(createProductUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ sku: 'CLOT-OCH-001', categoryId: 2 }),
    );
    expect(createProductUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ sku: 'HOME-SCP-001', categoryId: 3 }),
    );
    expect(createProductUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ sku: 'SPOR-EYM-001', categoryId: 4 }),
    );
    expect(createProductUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ sku: 'BOOK-ACC-001', categoryId: 5 }),
    );
  });

  it('should backfill null categoryId on existing demo SKUs only', async () => {
    const existing = DEMO_SEED_PRODUCTS.map((seed, idx) =>
      Product.fromPrimitives({
        id: 500 + idx,
        sku: seed.sku,
        name: seed.name,
        slug: seed.sku.toLowerCase(),
        price: seed.price,
        currency: 'USD',
        categoryId: null,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      }),
    );
    productRepository.mockSuccessfulList(existing);
    updateProductUseCase.execute.mockResolvedValue(
      Result.success({} as IProduct),
    );

    const result = await useCase.execute();

    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) {
      expect(result.value.length).toBe(DEMO_SEED_PRODUCTS.length);
      expect(result.value[0].status).toBe('existing');
      expect(result.value[0].id).toBe(500);
    }
    expect(createProductUseCase.execute).not.toHaveBeenCalled();
    expect(updateProductUseCase.execute).toHaveBeenCalledTimes(
      DEMO_SEED_PRODUCTS.length,
    );
    expect(updateProductUseCase.execute).toHaveBeenCalledWith({
      id: 500,
      categoryId: 1,
    });
    expect(updateProductUseCase.execute).toHaveBeenCalledWith({
      id: 505,
      categoryId: 2,
    });
  });

  it('should not update existing demo SKUs that already have a category', async () => {
    const existing = DEMO_SEED_PRODUCTS.map((seed, idx) => {
      const categoryId =
        DEMO_SEED_CATEGORIES.find((c) => c.slug === seed.categorySlug)?.id ??
        null;
      return Product.fromPrimitives({
        id: 500 + idx,
        sku: seed.sku,
        name: seed.name,
        slug: seed.sku.toLowerCase(),
        price: seed.price,
        currency: 'USD',
        categoryId,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    });
    productRepository.mockSuccessfulList(existing);

    const result = await useCase.execute();

    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) {
      expect(result.value.length).toBe(DEMO_SEED_PRODUCTS.length);
      expect(result.value[0].status).toBe('existing');
      expect(result.value[0].id).toBe(500);
    }
    expect(productRepository.findAll).toHaveBeenCalled();
    expect(createProductUseCase.execute).not.toHaveBeenCalled();
    expect(updateProductUseCase.execute).not.toHaveBeenCalled();
  });

  it('should fail when a demo category slug is missing or inactive', async () => {
    categoryRepository.mockSuccessfulFindAll([]);
    productRepository.mockSuccessfulList([]);

    const result = await useCase.execute();

    expect(result.isFailure).toBe(true);
    if (result.isFailure) {
      expect(result.error.message).toContain(
        'Demo category slug electronics is missing or inactive',
      );
    }
  });

  it('should propagate error if listing existing products fails', async () => {
    productRepository.mockListFailure('List failed');

    const result = await useCase.execute();

    expect(result.isFailure).toBe(true);
    if (result.isFailure) {
      expect(result.error.message).toContain(
        'Failed to load existing products',
      );
    }
  });

  it('should propagate failure if individual product creation fails', async () => {
    productRepository.mockSuccessfulList([]);
    createProductUseCase.execute.mockResolvedValue(
      Result.failure(new UseCaseError('Creation error')),
    );

    const result = await useCase.execute();

    expect(result.isFailure).toBe(true);
    if (result.isFailure) {
      expect(result.error.message).toContain('Failed to seed product');
    }
  });
});
