// src/modules/orders/orders.controller.spec.ts
import { Test, TestingModule } from '@nestjs/testing';
import { OrdersController } from './orders.controller';
import {
  OrderDtoTestFactory,
  OrderTestFactory,
} from 'src/modules/orders/testing';
import { AuthPayloadFactory } from 'src/testing/factories/auth-payload.factory';
import { MockIdempotencyStore } from 'src/testing/mocks/idempotency-store.mock';
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
import { CreateOrderPaymentUseCase } from './core/application/usecases/create-order-payment/create-order-payment.usecase';
import { DeliverOrderCommand } from './core/application/usecases/deliver-order/deliver-order.usecase';
import { Order } from './core/domain/entities/order';
import { OrderStatus } from './core/domain/value-objects/order-status';
import { CheckoutDto } from './primary-adapters/dto/checkout.dto';
import { ListOrdersQueryDto } from './primary-adapters/dto/list-orders-query.dto';
import { CallerContext } from '../../shared-kernel/domain/interfaces/caller-context.interface';
import { PaymentMethodType } from '../../shared-kernel/domain/value-objects/payment-method';
import { ErrorFactory } from '../../shared-kernel/domain/exceptions/error.factory';
import { UseCaseError } from '../../shared-kernel/domain/exceptions/usecase.error';
import { DECORATORS } from '@nestjs/swagger';
import { isRecord } from '../../shared-kernel/infra/lang/is-record';
import { ResultAssertionHelper } from '../../testing';

function findHeaderParam(target: object, paramName: string): unknown {
  const rawParams: unknown = Reflect.getMetadata(
    DECORATORS.API_PARAMETERS,
    target,
  );
  if (!Array.isArray(rawParams)) {
    return undefined;
  }
  return rawParams.find(
    (param: unknown) =>
      isRecord(param) && param.name === paramName && param.in === 'header',
  );
}

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
  let createOrderPaymentUseCase: jest.Mocked<CreateOrderPaymentUseCase>;
  let mockOrder: Order;
  let cancelledOrder: Order;
  let confirmedOrder: Order;
  let processingOrder: Order;
  let deliveredOrder: Order;
  let createDeliveredOrderDto: DeliverOrderCommand;
  let checkoutDto: CheckoutDto;
  let callerContext: CallerContext;

  beforeEach(async () => {
    mockOrder = OrderTestFactory.createDomainOrder();
    cancelledOrder = OrderTestFactory.createDomainOrder({
      status: OrderStatus.CANCELLED,
    });
    confirmedOrder = OrderTestFactory.createDomainOrder({
      status: OrderStatus.CONFIRMED,
    });
    processingOrder = OrderTestFactory.createDomainOrder({
      status: OrderStatus.PROCESSING,
    });
    deliveredOrder = OrderTestFactory.createDomainOrder({
      status: OrderStatus.DELIVERED,
    });
    createDeliveredOrderDto = OrderDtoTestFactory.createDeliverOrderCommand();
    checkoutDto = OrderDtoTestFactory.createCheckoutDto();
    callerContext = AuthPayloadFactory.createCustomerContext();

    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: IdempotencyStore,
          useValue: new MockIdempotencyStore(),
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
        {
          provide: CreateOrderPaymentUseCase,
          useValue: {
            execute: jest.fn().mockResolvedValue(Result.success(undefined)),
          },
        },
      ],
    }).compile();

    controller = module.get(OrdersController);
    checkoutUseCase = module.get(CheckoutUseCase);
    getOrderUseCase = module.get(GetOrderUseCase);
    listOrdersUseCase = module.get(ListOrdersUsecase);
    cancelOrderUseCase = module.get(CancelOrderUseCase);
    confirmOrderUseCase = module.get(ConfirmOrderUseCase);
    processOrderUseCase = module.get(ProcessOrderUseCase);
    deliverOrderUseCase = module.get(DeliverOrderUseCase);
    shipOrderUseCase = module.get(ShipOrderUseCase);
    createOrderPaymentUseCase = module.get(CreateOrderPaymentUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  it('should call CheckoutUseCase.execute when checkout is called', async () => {
    await controller.checkout(checkoutDto, callerContext);
    expect(checkoutUseCase.execute).toHaveBeenCalledWith({
      ...checkoutDto,
      callerContext,
    });
  });

  it.each([
    { endpoint: 'checkout', handler: OrdersController.prototype.checkout },
    {
      endpoint: 'createPayment',
      handler: OrdersController.prototype.createPayment,
    },
  ])(
    'documents Idempotency-Key as required header and omits legacy or response headers for $endpoint',
    ({ handler }) => {
      const idempotencyKeyHeader = findHeaderParam(handler, 'Idempotency-Key');
      expect(idempotencyKeyHeader).toMatchObject({
        in: 'header',
        required: true,
      });

      expect(findHeaderParam(handler, 'x-idempotency-key')).toBeUndefined();
      expect(findHeaderParam(handler, 'Retry-After')).toBeUndefined();
    },
  );

  it('does not expose idempotencyKey in CheckoutDto Swagger properties', () => {
    const rawProps: unknown = Reflect.getMetadata(
      DECORATORS.API_MODEL_PROPERTIES_ARRAY,
      CheckoutDto.prototype,
    );
    expect(Array.isArray(rawProps)).toBe(true);
    const props = Array.isArray(rawProps) ? rawProps : [];
    expect(props).not.toContain(':idempotencyKey');
  });

  it('should call GetOrderUseCase.execute when findOne is called and return its result', async () => {
    const res = await controller.findOne(mockOrder.id!, callerContext);
    expect(getOrderUseCase.execute).toHaveBeenCalledWith({
      orderId: mockOrder.id!,
      callerContext,
    });
    expect(res).toEqual(Result.success(mockOrder));
  });

  it('should call ListOrdersUseCase.execute when findAll is called and return its result', async () => {
    const query = new ListOrdersQueryDto();
    const res = await controller.findAll(query, callerContext);
    expect(listOrdersUseCase.execute).toHaveBeenCalledWith({
      query,
      callerContext,
    });
    expect(res).toEqual(Result.success([mockOrder]));
  });

  it('should call CancelOrderUseCase.execute when cancelOrder is called and return its result', async () => {
    const res = await controller.cancelOrder(cancelledOrder.id!);
    expect(cancelOrderUseCase.execute).toHaveBeenCalledWith({
      orderId: cancelledOrder.id!,
    });
    expect(res).toEqual(Result.success(cancelledOrder));
  });

  it('should call ConfirmOrderUseCase.execute when confirmOrder is called and return its result', async () => {
    const res = await controller.confirmOrder(confirmedOrder.id!);
    expect(confirmOrderUseCase.execute).toHaveBeenCalledWith(
      confirmedOrder.id!,
    );
    expect(res).toEqual(Result.success(confirmedOrder));
  });

  it('should call ProcessOrderUseCase.execute when processOrder is called and return its result', async () => {
    const res = await controller.processOrder(processingOrder.id!);
    expect(processOrderUseCase.execute).toHaveBeenCalledWith(
      processingOrder.id!,
    );
    expect(res).toEqual(Result.success(processingOrder));
  });

  it('should call DeliverOrderUseCase.execute when deliverOrder is called and return its result', async () => {
    const res = await controller.deliverOrder(
      deliveredOrder.id!,
      createDeliveredOrderDto,
    );
    expect(deliverOrderUseCase.execute).toHaveBeenCalledWith({
      id: deliveredOrder.id!,
      command: createDeliveredOrderDto,
    });
    expect(res).toEqual(Result.success(deliveredOrder));
  });

  it('should call ShipOrderUseCase.execute when shipOrder is called', async () => {
    await controller.shipOrder(processingOrder.id!);
    expect(shipOrderUseCase.execute).toHaveBeenCalledWith(processingOrder.id!);
  });

  it('should call CreateOrderPaymentUseCase.execute when createPayment is called', async () => {
    const dto = {
      paymentMethod: PaymentMethodType.CARD,
      paymentMethodDetails: { cardLast4: '4242' },
    };
    createOrderPaymentUseCase.execute.mockResolvedValue(
      Result.success(OrderDtoTestFactory.createCreatedPayment()),
    );

    const res = await controller.createPayment(123, dto, callerContext);

    expect(createOrderPaymentUseCase.execute).toHaveBeenCalledWith({
      orderId: 123,
      paymentMethod: dto.paymentMethod,
      paymentMethodDetails: dto.paymentMethodDetails,
      callerContext,
    });
    ResultAssertionHelper.assertResultSuccess(res);
    expect(res.value.amount).toBe(25.5);
    expect(res.value.refundedAmount).toBe(0);
  });

  it('returns the use case failure when createPayment fails', async () => {
    const failure = ErrorFactory.UseCaseError('Order with id 123 not found');
    createOrderPaymentUseCase.execute.mockResolvedValue(failure);

    const res = await controller.createPayment(
      123,
      { paymentMethod: PaymentMethodType.CARD },
      callerContext,
    );

    expect(res).toBe(failure);
    ResultAssertionHelper.assertResultFailure(
      res,
      'Order with id 123 not found',
      UseCaseError,
    );
  });
});
