// src/modules/orders/orders.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { GetOrderController } from './presentation/controllers/get-order/get-order.controller';
import { CreateOrderController } from './presentation/controllers/create-order/create-order.controller';
import { ListOrdersController } from './presentation/controllers/list-orders/list-orders.controller';
import { CancelOrderController } from './presentation/controllers/cancel-order/cancel-order.controller';
import { OrderTestFactory } from './testing/factories/order.factory';
import { CreateOrderDtoTestFactory } from './testing/factories/create-order-dto.factory';
import { ConfirmOrderController } from './presentation/controllers/confirm-order/confirm-order.controller';
import { DeliverOrderController } from './presentation/controllers/deliver-order/deliver-order.controller';
import { ProcessOrderController } from './presentation/controllers/process-order/process-order.controller';

describe('OrdersController', () => {
  let controller: OrdersController;
  let createOrderController: CreateOrderController;
  let getOrderController: GetOrderController;
  let listOrdersController: ListOrdersController;
  let cancelOrderController: CancelOrderController;
  let confirmOrderController: ConfirmOrderController;
  let processOrderController: ProcessOrderController;
  let deliverOrderController: DeliverOrderController;
  let mockOrder;
  let cancelledOrder;
  let confirmedOrder;
  let processingOrder;
  let deliveredOrder;
  let createOrderDto;
  let createDeliveredOrderDto;

  beforeEach(async () => {
    mockOrder = OrderTestFactory.createMockOrder();
    cancelledOrder = OrderTestFactory.createCancelledOrder();
    confirmedOrder = OrderTestFactory.createConfirmedOrder();
    processingOrder = OrderTestFactory.createProcessingOrder();
    deliveredOrder = OrderTestFactory.createDeliveredOrder();
    createOrderDto = CreateOrderDtoTestFactory.createMockDto();
    createDeliveredOrderDto = CreateOrderDtoTestFactory.createDeliverOrderDto();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: CreateOrderController,
          useValue: {
            handle: jest.fn().mockResolvedValue(mockOrder),
          },
        },
        {
          provide: GetOrderController,
          useValue: {
            handle: jest.fn().mockResolvedValue(mockOrder),
          },
        },
        {
          provide: ListOrdersController,
          useValue: {
            handle: jest.fn().mockResolvedValue([mockOrder]),
          },
        },
        {
          provide: CancelOrderController,
          useValue: {
            handle: jest.fn().mockResolvedValue(cancelledOrder),
          },
        },
        {
          provide: ConfirmOrderController,
          useValue: {
            handle: jest.fn().mockResolvedValue(confirmedOrder),
          },
        },
        {
          provide: ProcessOrderController,
          useValue: {
            handle: jest.fn().mockResolvedValue(processingOrder),
          },
        },
        {
          provide: DeliverOrderController,
          useValue: {
            handle: jest.fn().mockResolvedValue(deliveredOrder),
          },
        },
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
    createOrderController = module.get<CreateOrderController>(
      CreateOrderController,
    );
    getOrderController = module.get<GetOrderController>(GetOrderController);
    listOrdersController =
      module.get<ListOrdersController>(ListOrdersController);
    cancelOrderController = module.get<CancelOrderController>(
      CancelOrderController,
    );
    confirmOrderController = module.get<ConfirmOrderController>(
      ConfirmOrderController,
    );
    processOrderController = module.get<ProcessOrderController>(
      ProcessOrderController,
    );
    deliverOrderController = module.get<DeliverOrderController>(
      DeliverOrderController,
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call CreateOrderController.handle when createOrder is called and return its result', async () => {
    const res = await controller.createOrder(createOrderDto);
    expect(createOrderController.handle).toHaveBeenCalledWith(createOrderDto);
    expect(res).toEqual(mockOrder);
  });

  it('should call GetOrderController.handle when findOne is called and return its result', async () => {
    const res = await controller.findOne(mockOrder.id);
    expect(getOrderController.handle).toHaveBeenCalledWith(mockOrder.id);
    expect(res).toEqual(mockOrder);
  });

  it('should call ListOrdersController.handle when findAll is called and return its result', async () => {
    const query = {} as any;
    const res = await controller.findAll(query);
    expect(listOrdersController.handle).toHaveBeenCalledWith(query);
    expect(res).toEqual([mockOrder]);
  });

  it('should call CancelOrderController.handle when cancelOrder is called and return its result', async () => {
    const res = await controller.cancelOrder(cancelledOrder.id);
    expect(cancelOrderController.handle).toHaveBeenCalledWith(
      cancelledOrder.id,
    );
    expect(res).toEqual(cancelledOrder);
  });

  it('should call ConfirmOrderController.handle when confirmOrder is called and return its result', async () => {
    const res = await controller.confirmOrder(confirmedOrder.id);
    expect(confirmOrderController.handle).toHaveBeenCalledWith(
      confirmedOrder.id,
    );
    expect(res).toEqual(confirmedOrder);
  });

  it('should call ProcessOrderController.handle when processOrder is called and return its result', async () => {
    const res = await controller.processOrder(processingOrder.id);
    expect(processOrderController.handle).toHaveBeenCalledWith(
      processingOrder.id,
    );
    expect(res).toEqual(processingOrder);
  });

  it('should call DeliverOrderController.handle when deliverOrder is called and return its result', async () => {
    const res = await controller.deliverOrder(
      deliveredOrder.id,
      createDeliveredOrderDto,
    );
    expect(deliverOrderController.handle).toHaveBeenCalledWith(
      deliveredOrder.id,
      createDeliveredOrderDto,
    );
    expect(res).toEqual(deliveredOrder);
  });
});
