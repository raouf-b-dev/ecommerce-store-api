import { Test, TestingModule } from '@nestjs/testing';
import { ProductsController } from './products.controller';
import { GetProductController } from './presentation/controllers/GetProduct/get-product.controller';

describe('ProductsController', () => {
  let controller: ProductsController;
  let getProductController: GetProductController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ProductsController],
      providers: [
        {
          provide: GetProductController,
          useValue: {
            handle: jest
              .fn()
              .mockResolvedValue({ id: 1, name: 'Test Product' }),
          },
        },
      ],
    }).compile();

    controller = module.get<ProductsController>(ProductsController);
    getProductController =
      module.get<GetProductController>(GetProductController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call GetProductController.handle when findOne is called', async () => {
    const id = '1';
    await controller.findOne(id);
    expect(getProductController.handle).toHaveBeenCalledWith(1);
  });
});
