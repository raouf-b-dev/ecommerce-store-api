import { Test, TestingModule } from '@nestjs/testing';
import { CheckoutUseCase } from './checkout.usecase';
import { OrderScheduler } from '../../../domain/schedulers/order.scheduler';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { CheckoutCommand } from './checkout.usecase';
import { PaymentMethodType } from '../../../../../../shared-kernel/domain/value-objects/payment-method';
import { ResultAssertionHelper } from '../../../../../../testing/helpers/result-assertion.helper';
import { OrderRepository } from '../../../domain/repositories/order-repository';
import { OrderFactory } from '../../../domain/factories/order.factory';
import { PaymentMethodPolicy } from '../../../domain/services/payment-method-policy';
import { ValidateCheckoutUseCase } from '../validate-checkout/validate-checkout.usecase';
import { DomainEventPublisher } from 'src/shared-kernel/domain/interfaces/domain-event-publisher';
import { OrderTestFactory } from '../../../../testing/factories/order.factory';
import { createUserCallerContext } from '../../../../../../shared-kernel/domain/interfaces/caller-context.interface';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { OrderDtoTestFactory } from '../../../../testing/factories/order-dto.factory';

describe('CheckoutUseCase', () => {
  let useCase: CheckoutUseCase;
  let orderScheduler: jest.Mocked<OrderScheduler>;
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

  const customerCallerContext = createUserCallerContext({
    userId: 10,
    role: 'CUSTOMER',
    permissions: new Set(['manage_own_cart']),
  });

  beforeEach(async () => {
    const mockOrderScheduler = {
      scheduleCheckout: jest.fn(),
    };

    const mockOrderRepository = {
      save: jest.fn().mockResolvedValue({
        isSuccess: true,
        value: { id: '1001', status: 'pending_payment' },
      }),
      cancelOrder: jest.fn().mockResolvedValue(undefined),
    };

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

    const mockPaymentPolicy = {
      isOnlinePayment: jest.fn().mockReturnValue(true),
      isCashOnDelivery: jest.fn().mockReturnValue(false),
      getCheckoutMessage: jest
        .fn()
        .mockReturnValue(
          'Checkout initiated. Please check order status for payment details.',
        ),
      getInitialOrderStatus: jest.fn().mockReturnValue('pending_payment'),
      requiresManualConfirmation: jest.fn().mockReturnValue(false),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CheckoutUseCase,
        { provide: OrderScheduler, useValue: mockOrderScheduler },
        { provide: OrderRepository, useValue: mockOrderRepository },
        { provide: OrderFactory, useValue: mockOrderFactory },
        { provide: PaymentMethodPolicy, useValue: mockPaymentPolicy },
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
    orderScheduler = module.get(OrderScheduler);
    validateCheckoutUseCase = module.get(ValidateCheckoutUseCase);
    domainEventPublisher = module.get(DomainEventPublisher);
  });

  it('should schedule checkout with validated context', async () => {
    const command: CheckoutCommand = {
      cartId: mockCartId,
      paymentMethod: PaymentMethodType.CREDIT_CARD,
    };

    orderScheduler.scheduleCheckout.mockResolvedValue(
      Result.success('job-123'),
    );

    const result = await useCase.execute({
      command,
      callerContext: customerCallerContext,
      cartToken: null,
    });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(validateCheckoutUseCase.execute).toHaveBeenCalledWith({
      cartId: mockCartId,
      callerContext: customerCallerContext,
      cartToken: null,
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
      orderId: '1001',
      userId: mockuserId,
    });
  });

  it('should pass shipping address dto to validation use case', async () => {
    const shippingAddressDto = {
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
    };

    const command: CheckoutCommand = {
      cartId: mockCartId,
      paymentMethod: PaymentMethodType.CREDIT_CARD,
      shippingAddress: shippingAddressDto,
    };

    orderScheduler.scheduleCheckout.mockResolvedValue(
      Result.success('job-123'),
    );

    const result = await useCase.execute({
      command,
      callerContext: customerCallerContext,
      cartToken: null,
    });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(validateCheckoutUseCase.execute).toHaveBeenCalledWith({
      cartId: mockCartId,
      callerContext: customerCallerContext,
      cartToken: null,
      shippingAddress: shippingAddressDto,
    });
  });

  it('should return error when validation fails', async () => {
    validateCheckoutUseCase.execute.mockResolvedValue(
      ErrorFactory.UseCaseError('Validation failed'),
    );

    const command: CheckoutCommand = {
      cartId: mockCartId,
      paymentMethod: PaymentMethodType.CREDIT_CARD,
    };

    const result = await useCase.execute({
      command,
      callerContext: customerCallerContext,
      cartToken: null,
    });

    ResultAssertionHelper.assertResultFailure(result);
    expect(orderScheduler.scheduleCheckout).not.toHaveBeenCalled();
  });
});
