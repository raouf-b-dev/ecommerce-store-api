import { Test, TestingModule } from '@nestjs/testing';
import { CreateOrderPaymentUseCase } from './create-order-payment.usecase';
import { GetOrderUseCase } from '../get-order/get-order.usecase';
import { PaymentGateway } from '../../ports/payment.gateway';
import {
  MockOrdersPaymentGateway,
  OrderDtoTestFactory,
} from '../../../../testing';
import { PaymentMethodType } from '../../../../../../shared-kernel/domain/value-objects/payment-method';
import {
  SYSTEM_CALLER_CONTEXT,
  createUserCallerContext,
} from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { ResultAssertionHelper } from '../../../../../../testing';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';

describe('CreateOrderPaymentUseCase', () => {
  let useCase: CreateOrderPaymentUseCase;
  let getOrderExecute: jest.MockedFunction<GetOrderUseCase['execute']>;
  let paymentGateway: MockOrdersPaymentGateway;

  const customerContext = createUserCallerContext({
    userId: 2,
    role: 'CUSTOMER',
    permissions: new Set(['view_own_orders']),
  });
  const adminContext = createUserCallerContext({
    userId: 9,
    role: 'ADMIN',
    permissions: new Set(['view_all_orders']),
  });

  beforeEach(async () => {
    getOrderExecute = jest.fn();
    paymentGateway = new MockOrdersPaymentGateway();
    paymentGateway.createPayment.mockResolvedValue(
      Result.success(OrderDtoTestFactory.createCreatedPayment()),
    );

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateOrderPaymentUseCase,
        { provide: GetOrderUseCase, useValue: { execute: getOrderExecute } },
        { provide: PaymentGateway, useValue: paymentGateway },
      ],
    }).compile();

    useCase = module.get(CreateOrderPaymentUseCase);
  });

  it('charges the order total and the order owner', async () => {
    getOrderExecute.mockResolvedValue(
      Result.success(
        OrderDtoTestFactory.createOrderDetailDTO({
          id: 123,
          userId: 2,
          totalPrice: 25.5,
          currency: 'EUR',
        }),
      ),
    );

    const result = await useCase.execute({
      orderId: 123,
      paymentMethod: PaymentMethodType.STRIPE,
      paymentMethodDetails: { cardLast4: '4242' },
      callerContext: customerContext,
    });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(getOrderExecute).toHaveBeenCalledWith({
      orderId: 123,
      callerContext: customerContext,
    });
    expect(paymentGateway.createPayment).toHaveBeenCalledWith({
      orderId: 123,
      amount: 2550,
      currency: 'EUR',
      paymentMethod: PaymentMethodType.STRIPE,
      paymentMethodDetails: { cardLast4: '4242' },
      userId: 2,
    });
  });

  it('charges the order owner when an admin can see the order', async () => {
    getOrderExecute.mockResolvedValue(
      Result.success(
        OrderDtoTestFactory.createOrderDetailDTO({
          id: 123,
          userId: 2,
          totalPrice: 10,
          currency: 'USD',
        }),
      ),
    );

    const result = await useCase.execute({
      orderId: 123,
      paymentMethod: PaymentMethodType.STRIPE,
      callerContext: adminContext,
    });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(paymentGateway.createPayment).toHaveBeenCalledWith(
      expect.objectContaining({
        amount: 1000,
        currency: 'USD',
        userId: 2,
      }),
    );
  });

  it('charges a zero order total', async () => {
    getOrderExecute.mockResolvedValue(
      Result.success(
        OrderDtoTestFactory.createOrderDetailDTO({
          id: 123,
          userId: 2,
          totalPrice: 0,
          currency: 'USD',
        }),
      ),
    );

    const result = await useCase.execute({
      orderId: 123,
      paymentMethod: PaymentMethodType.STRIPE,
      callerContext: SYSTEM_CALLER_CONTEXT,
    });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(paymentGateway.createPayment).toHaveBeenCalledWith(
      expect.objectContaining({ amount: 0, currency: 'USD', userId: 2 }),
    );
  });

  it('returns the order failure when the caller cannot see the order', async () => {
    const notFound = ErrorFactory.UseCaseError('Order with id 123 not found');
    getOrderExecute.mockResolvedValue(notFound);

    const result = await useCase.execute({
      orderId: 123,
      paymentMethod: PaymentMethodType.STRIPE,
      callerContext: customerContext,
    });

    expect(result).toBe(notFound);
    expect(paymentGateway.createPayment).not.toHaveBeenCalled();
  });

  it('returns the money failure when the order total cannot be converted', async () => {
    getOrderExecute.mockResolvedValue(
      Result.success(
        OrderDtoTestFactory.createOrderDetailDTO({
          id: 123,
          userId: 2,
          totalPrice: 10,
          currency: 'US',
        }),
      ),
    );

    const result = await useCase.execute({
      orderId: 123,
      paymentMethod: PaymentMethodType.STRIPE,
      callerContext: customerContext,
    });

    ResultAssertionHelper.assertResultFailure(
      result,
      'Currency must be a 3-letter code (ISO 4217)',
    );
    expect(paymentGateway.createPayment).not.toHaveBeenCalled();
  });

  it('returns not found when there is no caller', async () => {
    const result = await useCase.execute({
      orderId: 123,
      paymentMethod: PaymentMethodType.STRIPE,
      callerContext: null,
    });

    ResultAssertionHelper.assertResultFailure(
      result,
      'Order with id 123 not found',
    );
    expect(getOrderExecute).not.toHaveBeenCalled();
    expect(paymentGateway.createPayment).not.toHaveBeenCalled();
  });
});
