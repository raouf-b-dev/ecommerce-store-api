import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { GetProductController } from './presentation/controllers/GetProduct/get-product.controller';
import { CreateProductController } from './presentation/controllers/CreateProduct/create-product.controller';
import { CreateProductDto } from './presentation/dto/create-product.dto';
import { Product } from './domain/entities/product';
import { DeleteProductController } from './presentation/controllers/DeleteProduct/delete-product.controller';
import { ListProductsController } from './presentation/controllers/ListProducts/list-products.controller';

describe('ProductsController', () => {
  let controller: ProductsController;

  let getProductController: GetProductController;
  let createProductController: CreateProductController;
  let deleteProductController: DeleteProductController;
  let listProductsController: ListProductsController;

  let product: Product;
  let productsList: Product[];
  let createProductDto: CreateProductDto;

  beforeEach(async () => {
    product = new Product({
      id: 1,
      name: 'Car',
      description: 'A fast red sports car',
      price: 35000,
      sku: 'CAR-001',
      stockQuantity: 10,
      createdAt: new Date('2025-01-01T10:00:00Z'),
      updatedAt: new Date('2025-08-13T15:00:00Z'),
    });

    productsList = [product];

    createProductDto = {
      name: 'Car',
      description: 'A fast red sports car',
      price: 35000,
      sku: 'CAR-001',
      stockQuantity: 10,
      createdAt: new Date('2025-01-01T10:00:00Z'),
      updatedAt: new Date('2025-08-13T15:00:00Z'),
    } as CreateProductDto;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: GetProductController,
          useValue: {
            handle: jest.fn().mockResolvedValue(product),
          },
        },
        {
          provide: ListProductsController,
          useValue: {
            handle: jest.fn().mockResolvedValue(productsList),
          },
        },
        {
          provide: CreateProductController,
          useValue: {
            handle: jest.fn().mockResolvedValue(product),
          },
        },
        {
          provide: DeleteProductController,
          useValue: {
            handle: jest.fn().mockResolvedValue(undefined),
          },
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);

    getProductController =
      module.get<GetProductController>(GetProductController);

    listProductsController = module.get<ListProductsController>(
      ListProductsController,
    );

    createProductController = module.get<CreateProductController>(
      CreateProductController,
    );

    deleteProductController = module.get<DeleteProductController>(
      DeleteProductController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call GetProductController.handle when findOne is called', async () => {
    const id = '1';
    await controller.findOne(id);
    expect(getProductController.handle).toHaveBeenCalledWith(1);
  });

  it('should call ListProductsController.handle when findAll is called', async () => {
    await controller.findAll();
    expect(listProductsController.handle).toHaveBeenCalledWith();
  });

  it('should call CreateProductController.handle when createProduct is called', async () => {
    await controller.createProduct(createProductDto);
    expect(createProductController.handle).toHaveBeenCalledWith(
      createProductDto,
    );
  });

  it('should call DeleteProductController.handle when remove is called', async () => {
    const id = '1';
    await controller.remove(id);
    expect(deleteProductController.handle).toHaveBeenCalledWith(1);
  });
});
