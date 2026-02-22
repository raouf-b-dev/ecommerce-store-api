import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { GetProductUseCase } from './application/usecases/get-product/get-product.usecase';
import { CreateProductUseCase } from './application/usecases/create-product/create-product.usecase';
import { CreateProductDto } from './presentation/dto/create-product.dto';
import { Product } from './domain/entities/product';
import { DeleteProductUseCase } from './application/usecases/delete-product/delete-product.usecase';
import { ListProductsUseCase } from './application/usecases/list-products/list-products.usecase';
import { UpdateProductUseCase } from './application/usecases/update-product/update-product.usecase';
import { UpdateProductDto } from './presentation/dto/update-product.dto';
import { Result } from '../../core/domain/result';

describe('ProductsController', () => {
  let controller: ProductsController;

  let createProductUseCase: CreateProductUseCase;
  let getProductUseCase: GetProductUseCase;
  let listProductsUseCase: ListProductsUseCase;
  let updateProductUseCase: UpdateProductUseCase;
  let deleteProductUseCase: DeleteProductUseCase;

  let product: Product;
  let productsList: Product[];
  let createProductDto: CreateProductDto;
  let updateProductDto: UpdateProductDto;
  let id: number;

  beforeEach(async () => {
    id = 1;
    product = new Product({
      id,
      name: 'Car',
      description: 'A fast red sports car',
      price: 35000,
      sku: 'CAR-001',
      createdAt: new Date('2025-01-01T10:00:00Z'),
      updatedAt: new Date('2025-08-13T15:00:00Z'),
    });

    productsList = [product];

    createProductDto = {
      name: 'Car',
      description: 'A fast red sports car',
      price: 35000,
      sku: 'CAR-001',
    };

    updateProductDto = {
      name: 'Car',
      description: 'A fast red sports car',
      price: 35000,
      sku: 'CAR-001',
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: GetProductUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(product)),
          },
        },
        {
          provide: ListProductsUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(productsList)),
          },
        },
        {
          provide: CreateProductUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(product)),
          },
        },
        {
          provide: UpdateProductUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(product)),
          },
        },
        {
          provide: DeleteProductUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(undefined)),
          },
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);

    getProductUseCase = module.get<GetProductUseCase>(GetProductUseCase);
    listProductsUseCase = module.get<ListProductsUseCase>(ListProductsUseCase);
    createProductUseCase =
      module.get<CreateProductUseCase>(CreateProductUseCase);
    updateProductUseCase =
      module.get<UpdateProductUseCase>(UpdateProductUseCase);
    deleteProductUseCase =
      module.get<DeleteProductUseCase>(DeleteProductUseCase);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call GetProductUseCase.execute when findOne is called', async () => {
    await controller.findOne(id.toString());
    expect(getProductUseCase.execute).toHaveBeenCalledWith(id);
  });

  it('should call ListProductsUseCase.execute when findAll is called', async () => {
    await controller.findAll();
    expect(listProductsUseCase.execute).toHaveBeenCalledWith();
  });

  it('should call CreateProductUseCase.execute when createProduct is called', async () => {
    await controller.createProduct(createProductDto);
    expect(createProductUseCase.execute).toHaveBeenCalledWith(createProductDto);
  });

  it('should call UpdateProductUseCase.execute when createProduct is called', async () => {
    await controller.update(id.toString(), updateProductDto);
    expect(updateProductUseCase.execute).toHaveBeenCalledWith({
      id: id,
      dto: updateProductDto,
    });
  });

  it('should call DeleteProductUseCase.execute when remove is called', async () => {
    await controller.remove(id.toString());
    expect(deleteProductUseCase.execute).toHaveBeenCalledWith(id);
  });
});
