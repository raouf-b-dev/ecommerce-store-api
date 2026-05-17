// src/modules/orders/orders.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import { OrderTestFactory } from './testing/factories/order.factory';
import { OrderCommandTestFactory } from './testing/factories/create-order-dto.factory';
import { IdempotencyStore } from '../../shared-kernel/domain/stores/idempotency.store';
import { Result } from '../../shared-kernel/domain/result';
import { AuthGuard } from '../../guards/auth.guard';
import { PermissionsGuard } from '../auth/primary-adapters/guards/permissions.guard';
import { GetOrderUseCase } from './core/application/usecases/get-order/get-order.usecase';
import { CheckoutUseCase } from './core/application/usecases/checkout/checkout.usecase';
import { ShipOrderUseCase } from './core/application/usecases/ship-order/ship-order.usecase';
import { ListOrdersUsecase } from './core/application/usecases/list-orders/list-orders.usecase';
import { CancelOrderUseCase } from './core/application/usecases/cancel-order/cancel-order.usecase';
import { ConfirmOrderUseCase } from './core/application/usecases/confirm-order/confirm-order.usecase';
import { DeliverOrderUseCase } from './core/application/usecases/deliver-order/deliver-order.usecase';
import { ProcessOrderUseCase } from './core/application/usecases/process-order/process-order.usecase';
import { DeliverOrderCommand } from './core/application/usecases/deliver-order/deliver-order.usecase';
import { Order } from './core/domain/entities/order';
import { OrderStatus } from './core/domain/value-objects/order-status';
import { CheckoutDto } from './primary-adapters/dto/checkout.dto';
import { ListOrdersQueryDto } from './primary-adapters/dto/list-orders-query.dto';

describe('OrdersController', () => {
  let controller: OrdersController;
  let checkoutUseCase: jest.Mocked<CheckoutUseCase>;
  let getOrderUseCase: jest.Mocked<GetOrderUseCase>;
  let listOrdersUseCase: jest.Mocked<ListOrdersUsecase>;
  let cancelOrderUseCase: jest.Mocked<CancelOrderUseCase>;
  let confirmOrderUseCase: jest.Mocked<ConfirmOrderUseCase>;
  let processOrderUseCase: jest.Mocked<ProcessOrderUseCase>;
  let deliverOrderUseCase: jest.Mocked<DeliverOrderUseCase>;
  let shipOrderUseCase: jest.Mocked<ShipOrderUseCase>;
  let mockOrder: Order;
  let cancelledOrder: Order;
  let confirmedOrder: Order;
  let processingOrder: Order;
  let deliveredOrder: Order;
  let createDeliveredOrderDto: DeliverOrderCommand;
  let checkoutDto: CheckoutDto;

  beforeEach(async () => {
    mockOrder = OrderTestFactory.createOrderEntity();
    cancelledOrder = OrderTestFactory.createOrderEntity({
      status: OrderStatus.CANCELLED,
    });
    confirmedOrder = OrderTestFactory.createOrderEntity({
      status: OrderStatus.CONFIRMED,
    });
    processingOrder = OrderTestFactory.createOrderEntity({
      status: OrderStatus.PROCESSING,
    });
    deliveredOrder = OrderTestFactory.createOrderEntity({
      status: OrderStatus.DELIVERED,
    });
    createDeliveredOrderDto =
      OrderCommandTestFactory.createDeliverOrderCommand();
    const cmd = OrderCommandTestFactory.createCreditCardCheckoutCommand();
    checkoutDto = {
      ...cmd,
      shippingAddress: cmd.shippingAddress
        ? {
            ...cmd.shippingAddress,
            firstName: cmd.shippingAddress.firstName || 'Test',
            lastName: cmd.shippingAddress.lastName || 'User',
          }
        : undefined,
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
    })
      .overrideGuard(AuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get<OrdersController>(OrdersController);
    checkoutUseCase = module.get(CheckoutUseCase);
    getOrderUseCase = module.get(GetOrderUseCase);
    listOrdersUseCase = module.get(ListOrdersUsecase);
    cancelOrderUseCase = module.get(CancelOrderUseCase);
    confirmOrderUseCase = module.get(ConfirmOrderUseCase);
    processOrderUseCase = module.get(ProcessOrderUseCase);
    deliverOrderUseCase = module.get(DeliverOrderUseCase);
    shipOrderUseCase = module.get(ShipOrderUseCase);
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
      command: checkoutDto,
      userId: Number(userId),
    });
  });

  it('should call GetOrderUseCase.execute when findOne is called and return its result', async () => {
    const res = await controller.findOne(String(mockOrder.id));
    expect(getOrderUseCase.execute).toHaveBeenCalledWith(Number(mockOrder.id));
    expect(res).toEqual(Result.success(mockOrder));
  });

  it('should call ListOrdersUseCase.execute when findAll is called and return its result', async () => {
    const query = new ListOrdersQueryDto();
    const res = await controller.findAll(query);
    expect(listOrdersUseCase.execute).toHaveBeenCalledWith(query);
    expect(res).toEqual(Result.success([mockOrder]));
  });

  it('should call CancelOrderUseCase.execute when cancelOrder is called and return its result', async () => {
    const res = await controller.cancelOrder(String(cancelledOrder.id));
    expect(cancelOrderUseCase.execute).toHaveBeenCalledWith({
      orderId: Number(cancelledOrder.id),
    });
    expect(res).toEqual(Result.success(cancelledOrder));
  });

  it('should call ConfirmOrderUseCase.execute when confirmOrder is called and return its result', async () => {
    const res = await controller.confirmOrder(String(confirmedOrder.id));
    expect(confirmOrderUseCase.execute).toHaveBeenCalledWith({
      orderId: Number(confirmedOrder.id),
      reservationId: undefined,
      cartId: undefined,
    });
    expect(res).toEqual(Result.success(confirmedOrder));
  });

  it('should call ProcessOrderUseCase.execute when processOrder is called and return its result', async () => {
    const res = await controller.processOrder(String(processingOrder.id));
    expect(processOrderUseCase.execute).toHaveBeenCalledWith(
      Number(processingOrder.id),
    );
    expect(res).toEqual(Result.success(processingOrder));
  });

  it('should call DeliverOrderUseCase.execute when deliverOrder is called and return its result', async () => {
    const res = await controller.deliverOrder(
      String(deliveredOrder.id),
      createDeliveredOrderDto,
    );
    expect(deliverOrderUseCase.execute).toHaveBeenCalledWith({
      id: Number(deliveredOrder.id),
      command: createDeliveredOrderDto,
    });
    expect(res).toEqual(Result.success(deliveredOrder));
  });
});
