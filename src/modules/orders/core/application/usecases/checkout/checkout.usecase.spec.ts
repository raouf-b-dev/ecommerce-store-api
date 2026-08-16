import { Test, TestingModule } from '@nestjs/testing';
import { CheckoutUseCase } from './checkout.usecase';
import { OrderScheduler } from '../../../domain/schedulers/order.scheduler';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { ResultAssertionHelper } from '../../../../../../testing/helpers/result-assertion.helper';
import { OrderRepository } from '../../../domain/repositories/order-repository';
import { OrderFactory } from '../../../domain/factories/order.factory';
import { ValidateCheckoutUseCase } from '../validate-checkout/validate-checkout.usecase';
import { DomainEventPublisher } from 'src/shared-kernel/domain/interfaces/domain-event-publisher';
import { AuthPayloadFactory } from 'src/testing/factories/auth-payload.factory';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import {
  MockOrderRepository,
  MockOrderScheduler,
  OrderDtoTestFactory,
  OrderTestFactory,
} from 'src/modules/orders/testing';

describe('CheckoutUseCase', () => {
  let useCase: CheckoutUseCase;
  let orderScheduler: MockOrderScheduler;
  let validateCheckoutUseCase: jest.Mocked<ValidateCheckoutUseCase>;
  let domainEventPublisher: DomainEventPublisher;
  const mockuserId = 123;
  const mockCartId = 123;

  const mockUser = OrderDtoTestFactory.createCheckoutUserInfoResult({
    id: mockuserId,
  });

  const mockCart = OrderDtoTestFactory.createCheckoutCartInfo({
    id: mockCartId,
    userId: mockuserId,
  });

  const mockResolvedAddress =
    OrderTestFactory.createMockOrder().shippingAddress;

  const customerCallerContext = AuthPayloadFactory.createCustomerContext({
    userId: 10,
  });

  beforeEach(async () => {
    orderScheduler = new MockOrderScheduler();
    const orderRepository = new MockOrderRepository();
    orderRepository.save.mockImplementation((order: { id?: number | null }) => {
      order.id = 1001;
      return Promise.resolve(Result.success(order as never));
    });

    const mockOrderFactory = {
      createFromCart: jest.fn().mockReturnValue({
        id: null,
        totalPrice: 100,
        items: [],
      }),
    };

    const mockValidateCheckoutUseCase = {
      execute: jest.fn().mockResolvedValue(
        Result.success({
          customer: mockUser,
          cart: mockCart,
          shippingAddress: mockResolvedAddress,
          userId: mockuserId,
        }),
      ),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckoutUseCase,
        { provide: OrderScheduler, useValue: orderScheduler },
        { provide: OrderRepository, useValue: orderRepository },
        { provide: OrderFactory, useValue: mockOrderFactory },
        {
          provide: ValidateCheckoutUseCase,
          useValue: mockValidateCheckoutUseCase,
        },
        {
          provide: DomainEventPublisher,
          useValue: { publish: jest.fn() },
        },
      ],
    }).compile();

    useCase = module.get<CheckoutUseCase>(CheckoutUseCase);
    validateCheckoutUseCase = module.get(ValidateCheckoutUseCase);
    domainEventPublisher = module.get(DomainEventPublisher);
  });

  it('should schedule checkout with validated context', async () => {
    const command = OrderDtoTestFactory.createCheckoutCommand({
      cartId: mockCartId,
      shippingAddress: undefined,
      callerContext: AuthPayloadFactory.createCallerContext(),
    });

    orderScheduler.scheduleCheckout.mockResolvedValue(
      Result.success('job-123'),
    );

    const result = await useCase.execute({
      ...command,
      callerContext: customerCallerContext,
    });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(validateCheckoutUseCase.execute).toHaveBeenCalledWith({
      cartId: mockCartId,
      callerContext: customerCallerContext,
      shippingAddress: undefined,
    });
    expect(orderScheduler.scheduleCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        shippingAddress: mockResolvedAddress,
        userId: mockuserId,
      }),
    );

    expect(domainEventPublisher.publish).toHaveBeenCalledWith(
      'cart.checkout.initiated',
      {
        cartId: mockCartId,
        userId: mockuserId,
      },
    );
    expect(domainEventPublisher.publish).toHaveBeenCalledWith('order.created', {
      orderId: 1001,
      userId: mockuserId,
    });
  });

  it('should pass shipping address dto to validation use case', async () => {
    const shippingAddressDto =
      OrderDtoTestFactory.createCheckoutShippingAddressInput({
        firstName: 'Jane',
        lastName: 'Doe',
        street: '456 New St',
        street2: 'Apt 2',
        city: 'New City',
        state: 'NS',
        postalCode: '99999',
        country: 'US',
        phone: '+9876543210',
        deliveryInstructions: 'Leave at back door',
      });

    const command = OrderDtoTestFactory.createCheckoutCommand({
      cartId: mockCartId,
      shippingAddress: shippingAddressDto,
      callerContext: AuthPayloadFactory.createCallerContext(),
    });

    orderScheduler.scheduleCheckout.mockResolvedValue(
      Result.success('job-123'),
    );

    const result = await useCase.execute({
      ...command,
      callerContext: customerCallerContext,
    });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(validateCheckoutUseCase.execute).toHaveBeenCalledWith({
      cartId: mockCartId,
      callerContext: customerCallerContext,
      shippingAddress: shippingAddressDto,
    });
  });

  it('should return error when validation fails', async () => {
    validateCheckoutUseCase.execute.mockResolvedValue(
      ErrorFactory.UseCaseError('Validation failed'),
    );

    const command = OrderDtoTestFactory.createCheckoutCommand({
      cartId: mockCartId,
      callerContext: AuthPayloadFactory.createCallerContext(),
    });

    const result = await useCase.execute({
      ...command,
      callerContext: customerCallerContext,
    });

    ResultAssertionHelper.assertResultFailure(result);
    expect(orderScheduler.scheduleCheckout).not.toHaveBeenCalled();
  });
});
