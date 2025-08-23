import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { GetProductController } from './presentation/controllers/GetProduct/get-product.controller';
import { CreateProductController } from './presentation/controllers/CreateProduct/create-product.controller';
import { CreateProductDto } from './presentation/dto/create-product.dto';
import { Product } from './domain/entities/product';
import { DeleteProductController } from './presentation/controllers/DeleteProduct/delete-product.controller';
import { ListProductsController } from './presentation/controllers/ListProducts/list-products.controller';
import { UpdateProductController } from './presentation/controllers/UpdateProduct/update-product.controller';
import { UpdateProductDto } from './presentation/dto/update-product.dto';

describe('ProductsController', () => {
  let controller: ProductsController;

  let createProductController: CreateProductController;
  let getProductController: GetProductController;
  let listProductsController: ListProductsController;
  let updateProductController: UpdateProductController;
  let deleteProductController: DeleteProductController;

  let product: Product;
  let productsList: Product[];
  let createProductDto: CreateProductDto;
  let updateProductDto: UpdateProductDto;
  let id: string;

  beforeEach(async () => {
    id = 'PR0000001';
    product = new Product({
      id,
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
    } as CreateProductDto;

    updateProductDto = {
      name: 'Car',
      description: 'A fast red sports car',
      price: 35000,
      sku: 'CAR-001',
    } as UpdateProductDto;

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
          provide: UpdateProductController,
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
    updateProductController = module.get<UpdateProductController>(
      UpdateProductController,
    );

    deleteProductController = module.get<DeleteProductController>(
      DeleteProductController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call GetProductController.handle when findOne is called', async () => {
    await controller.findOne(id.toString());
    expect(getProductController.handle).toHaveBeenCalledWith(id);
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

  it('should call UpdateProductController.handle when createProduct is called', async () => {
    await controller.update(id.toString(), updateProductDto);
    expect(updateProductController.handle).toHaveBeenCalledWith(
      id,
      updateProductDto,
    );
  });

  it('should call DeleteProductController.handle when remove is called', async () => {
    await controller.remove(id.toString());
    expect(deleteProductController.handle).toHaveBeenCalledWith(id);
  });
});
