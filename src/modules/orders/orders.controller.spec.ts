import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { GetOrderController } from './presentation/controllers/GetOrder/get-order.controller';

describe('OrdersController', () => {
  let controller: OrdersController;
  let getOrderController: GetOrderController;
  let id: string;
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: GetOrderController,
          useValue: {
            handle: jest.fn().mockResolvedValue({ id: 1, name: 'Test Order' }),
          },
        },
      ],
    }).compile();
    id = 'OR00000001';

    controller = module.get<OrdersController>(OrdersController);
    getOrderController = module.get<GetOrderController>(GetOrderController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call GetOrderController.handle when findOne is called', async () => {
    await controller.findOne(id);
    expect(getOrderController.handle).toHaveBeenCalledWith(id);
  });
});
