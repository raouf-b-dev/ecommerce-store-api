import { Test, TestingModule } from '@nestjs/testing';
import { SeedDemoCatalogUseCase } from './seed-demo-catalog.usecase';
import { CreateProductUseCase } from '../usecases/create-product/create-product.usecase';
import { ListProductsUseCase } from '../usecases/list-products/list-products.usecase';
import { Result } from '../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../shared-kernel/domain/exceptions/usecase.error';
import { DEMO_SEED_PRODUCTS } from './demo-products';
import { IProduct } from '../../domain/interfaces/product.interface';
import { CreateProductInput } from '../../domain/repositories/product-repository';

describe('SeedDemoCatalogUseCase', () => {
  let useCase: SeedDemoCatalogUseCase;
  let listProductsUseCase: jest.Mocked<ListProductsUseCase>;
  let createProductUseCase: jest.Mocked<CreateProductUseCase>;

  beforeEach(async () => {
    const mockListUseCase = {
      execute: jest.fn(),
    };
    const mockCreateUseCase = {
      execute: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SeedDemoCatalogUseCase,
        {
          provide: ListProductsUseCase,
          useValue: mockListUseCase,
        },
        {
          provide: CreateProductUseCase,
          useValue: mockCreateUseCase,
        },
      ],
    }).compile();

    useCase = module.get<SeedDemoCatalogUseCase>(SeedDemoCatalogUseCase);
    listProductsUseCase = module.get<ListProductsUseCase>(
      ListProductsUseCase,
    ) as unknown as jest.Mocked<ListProductsUseCase>;
    createProductUseCase = module.get<CreateProductUseCase>(
      CreateProductUseCase,
    ) as unknown as jest.Mocked<CreateProductUseCase>;
  });

  it('should seed missing catalog products and return them', async () => {
    listProductsUseCase.execute.mockResolvedValue(Result.success([]));
    createProductUseCase.execute.mockImplementation((cmd: CreateProductInput) =>
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
  });

  it('should skip seeding for products that already exist', async () => {
    const existing: IProduct[] = DEMO_SEED_PRODUCTS.map(
      (seed, idx) =>
        ({
          id: 500 + idx,
          sku: seed.sku,
          name: seed.name,
          description: seed.description,
          price: seed.price,
        }) as IProduct,
    );

    listProductsUseCase.execute.mockResolvedValue(Result.success(existing));

    const result = await useCase.execute();

    expect(result.isSuccess).toBe(true);
    if (result.isSuccess) {
      expect(result.value.length).toBe(DEMO_SEED_PRODUCTS.length);
      expect(result.value[0].status).toBe('existing');
      expect(result.value[0].id).toBe(500);
    }
    expect(createProductUseCase.execute).not.toHaveBeenCalled();
  });

  it('should propagate error if listing existing products fails', async () => {
    listProductsUseCase.execute.mockResolvedValue(
      Result.failure(new UseCaseError('List failed')),
    );

    const result = await useCase.execute();

    expect(result.isFailure).toBe(true);
    if (result.isFailure) {
      expect(result.error.message).toContain(
        'Failed to load existing products',
      );
    }
  });

  it('should propagate failure if individual product creation fails', async () => {
    listProductsUseCase.execute.mockResolvedValue(Result.success([]));
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
