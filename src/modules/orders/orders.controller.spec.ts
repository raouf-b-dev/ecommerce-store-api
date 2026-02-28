// src/modules/orders/orders.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrderTestFactory } from './testing/factories/order.factory';
import { CreateOrderDtoTestFactory } from './testing/factories/create-order-dto.factory';
import { IdempotencyStore } from '../../shared-kernel/domain/stores/idempotency.store';
import { Result } from '../../shared-kernel/domain/result';

import { GetOrderUseCase } from './core/application/usecases/get-order/get-order.usecase';
import { CheckoutUseCase } from './core/application/usecases/checkout/checkout.usecase';
import { ShipOrderUseCase } from './core/application/usecases/ship-order/ship-order.usecase';
import { ListOrdersUsecase } from './core/application/usecases/list-orders/list-orders.usecase';
import { CancelOrderUseCase } from './core/application/usecases/cancel-order/cancel-order.usecase';
import { ConfirmOrderUseCase } from './core/application/usecases/confirm-order/confirm-order.usecase';
import { DeliverOrderUseCase } from './core/application/usecases/deliver-order/deliver-order.usecase';
import { ProcessOrderUseCase } from './core/application/usecases/process-order/process-order.usecase';

describe('OrdersController', () => {
  let controller: OrdersController;
  let checkoutUseCase: CheckoutUseCase;
  let getOrderUseCase: GetOrderUseCase;
  let listOrdersUseCase: ListOrdersUsecase;
  let cancelOrderUseCase: CancelOrderUseCase;
  let confirmOrderUseCase: ConfirmOrderUseCase;
  let processOrderUseCase: ProcessOrderUseCase;
  let deliverOrderUseCase: DeliverOrderUseCase;
  let shipOrderUseCase: ShipOrderUseCase;
  let mockOrder;
  let cancelledOrder;
  let confirmedOrder;
  let processingOrder;
  let deliveredOrder;
  let createDeliveredOrderDto;
  let checkoutDto;

  beforeEach(async () => {
    mockOrder = OrderTestFactory.createMockOrder();
    cancelledOrder = OrderTestFactory.createCancelledOrder();
    confirmedOrder = OrderTestFactory.createConfirmedOrder();
    processingOrder = OrderTestFactory.createProcessingOrder();
    deliveredOrder = OrderTestFactory.createDeliveredOrder();
    createDeliveredOrderDto = CreateOrderDtoTestFactory.createDeliverOrderDto();
    checkoutDto = {
      cartId: 123,
      shippingAddressId: 123,
      paymentMethod: 'credit_card',
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: IdempotencyStore,
          useValue: {
            checkAndLock: jest.fn(),
            complete: jest.fn(),
            release: jest.fn(),
          },
        },
        {
          provide: CheckoutUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(undefined)),
          },
        },
        {
          provide: GetOrderUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(mockOrder)),
          },
        },
        {
          provide: ListOrdersUsecase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success([mockOrder])),
          },
        },
        {
          provide: CancelOrderUseCase,
          useValue: {
            execute: jest
              .fn()
              .mockResolvedValue(Result.success(cancelledOrder)),
          },
        },
        {
          provide: ConfirmOrderUseCase,
          useValue: {
            execute: jest
              .fn()
              .mockResolvedValue(Result.success(confirmedOrder)),
          },
        },
        {
          provide: ProcessOrderUseCase,
          useValue: {
            execute: jest
              .fn()
              .mockResolvedValue(Result.success(processingOrder)),
          },
        },
        {
          provide: DeliverOrderUseCase,
          useValue: {
            execute: jest
              .fn()
              .mockResolvedValue(Result.success(deliveredOrder)),
          },
        },
        {
          provide: ShipOrderUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(undefined)),
          },
        },
      ],
    }).compile();

    controller = module.get<OrdersController>(OrdersController);
    checkoutUseCase = module.get<CheckoutUseCase>(CheckoutUseCase);
    getOrderUseCase = module.get<GetOrderUseCase>(GetOrderUseCase);
    listOrdersUseCase = module.get<ListOrdersUsecase>(ListOrdersUsecase);
    cancelOrderUseCase = module.get<CancelOrderUseCase>(CancelOrderUseCase);
    confirmOrderUseCase = module.get<ConfirmOrderUseCase>(ConfirmOrderUseCase);
    processOrderUseCase = module.get<ProcessOrderUseCase>(ProcessOrderUseCase);
    deliverOrderUseCase = module.get<DeliverOrderUseCase>(DeliverOrderUseCase);
    shipOrderUseCase = module.get<ShipOrderUseCase>(ShipOrderUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call CheckoutUseCase.execute when checkout is called', async () => {
    const userId = '123';
    await controller.checkout(checkoutDto, userId);
    expect(checkoutUseCase.execute).toHaveBeenCalledWith({
      dto: checkoutDto,
      userId: Number(userId),
    });
  });

  it('should call GetOrderUseCase.execute when findOne is called and return its result', async () => {
    const res = await controller.findOne(mockOrder.id);
    expect(getOrderUseCase.execute).toHaveBeenCalledWith(Number(mockOrder.id));
    expect(res).toEqual(Result.success(mockOrder));
  });

  it('should call ListOrdersUseCase.execute when findAll is called and return its result', async () => {
    const query = {} as any;
    const res = await controller.findAll(query);
    expect(listOrdersUseCase.execute).toHaveBeenCalledWith(query);
    expect(res).toEqual(Result.success([mockOrder]));
  });

  it('should call CancelOrderUseCase.execute when cancelOrder is called and return its result', async () => {
    const res = await controller.cancelOrder(cancelledOrder.id);
    expect(cancelOrderUseCase.execute).toHaveBeenCalledWith(
      Number(cancelledOrder.id),
    );
    expect(res).toEqual(Result.success(cancelledOrder));
  });

  it('should call ConfirmOrderUseCase.execute when confirmOrder is called and return its result', async () => {
    const res = await controller.confirmOrder(confirmedOrder.id);
    expect(confirmOrderUseCase.execute).toHaveBeenCalledWith({
      orderId: Number(confirmedOrder.id),
      reservationId: undefined,
      cartId: undefined,
    });
    expect(res).toEqual(Result.success(confirmedOrder));
  });

  it('should call ProcessOrderUseCase.execute when processOrder is called and return its result', async () => {
    const res = await controller.processOrder(processingOrder.id);
    expect(processOrderUseCase.execute).toHaveBeenCalledWith(
      Number(processingOrder.id),
    );
    expect(res).toEqual(Result.success(processingOrder));
  });

  it('should call DeliverOrderUseCase.execute when deliverOrder is called and return its result', async () => {
    const res = await controller.deliverOrder(
      deliveredOrder.id,
      createDeliveredOrderDto,
    );
    expect(deliverOrderUseCase.execute).toHaveBeenCalledWith({
      id: Number(deliveredOrder.id),
      deliverOrderDto: createDeliveredOrderDto,
    });
    expect(res).toEqual(Result.success(deliveredOrder));
  });
});
