import { Test, TestingModule } from '@nestjs/testing';
import { CheckoutUseCase } from './checkout.usecase';
import { OrderScheduler } from '../../../domain/schedulers/order.scheduler';
import { Result } from '../../../../../core/domain/result';
import { CheckoutDto } from '../../../presentation/dto/checkout.dto';
import { PaymentMethodType } from '../../../../payments/domain';
import { ResultAssertionHelper } from '../../../../../testing/helpers/result-assertion.helper';
import { OrderRepository } from '../../../domain/repositories/order-repository';
import { OrderFactory } from '../../../domain/factories/order.factory';
import { PaymentMethodPolicy } from '../../../domain/services/payment-method-policy';
import { ValidateCheckoutUseCase } from '../validate-checkout/validate-checkout.usecase';
import { CartTestFactory } from '../../../../carts/testing/factories/cart.factory';
import { OrderTestFactory } from '../../../testing/factories/order.factory';
import { CustomerTestFactory } from '../../../../customers/testing/factories/customer.factory';
import { Customer } from '../../../../customers/domain/entities/customer';

describe('CheckoutUseCase', () => {
  let useCase: CheckoutUseCase;
  let orderScheduler: jest.Mocked<OrderScheduler>;
  let validateCheckoutUseCase: jest.Mocked<ValidateCheckoutUseCase>;

  const mockUserId = 123;
  const mockCartId = 123;

  const mockCustomer = Customer.fromPrimitives(
    CustomerTestFactory.createCustomerWithAddress({ id: mockUserId }),
  );

  const mockCart = CartTestFactory.createCartWithItems(1, {
    id: mockCartId,
    customerId: mockUserId,
  });

  const mockResolvedAddress =
    OrderTestFactory.createMockOrder().shippingAddress;

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
          customer: mockCustomer,
          cart: mockCart,
          shippingAddress: mockResolvedAddress,
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
      ],
    }).compile();

    useCase = module.get<CheckoutUseCase>(CheckoutUseCase);
    orderScheduler = module.get(OrderScheduler);
    validateCheckoutUseCase = module.get(ValidateCheckoutUseCase);
  });

  it('should schedule checkout with validated context', async () => {
    const dto: CheckoutDto = {
      cartId: mockCartId,
      paymentMethod: PaymentMethodType.CREDIT_CARD,
    };

    orderScheduler.scheduleCheckout.mockResolvedValue(
      Result.success('job-123'),
    );

    const result = await useCase.execute({ dto, userId: mockUserId });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(validateCheckoutUseCase.execute).toHaveBeenCalledWith({
      cartId: mockCartId,
      userId: mockUserId,
      shippingAddress: undefined,
    });
    expect(orderScheduler.scheduleCheckout).toHaveBeenCalledWith(
      expect.objectContaining({
        shippingAddress: mockResolvedAddress,
      }),
    );
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

    const dto: CheckoutDto = {
      cartId: mockCartId,
      paymentMethod: PaymentMethodType.CREDIT_CARD,
      shippingAddress: shippingAddressDto,
    };

    orderScheduler.scheduleCheckout.mockResolvedValue(
      Result.success('job-123'),
    );

    const result = await useCase.execute({ dto, userId: mockUserId });

    ResultAssertionHelper.assertResultSuccess(result);
    expect(validateCheckoutUseCase.execute).toHaveBeenCalledWith({
      cartId: mockCartId,
      userId: mockUserId,
      shippingAddress: shippingAddressDto,
    });
  });

  it('should return error when validation fails', async () => {
    validateCheckoutUseCase.execute.mockResolvedValue(
      Result.failure({ message: 'Validation failed' } as any),
    );

    const dto: CheckoutDto = {
      cartId: mockCartId,
      paymentMethod: PaymentMethodType.CREDIT_CARD,
    };

    const result = await useCase.execute({ dto, userId: mockUserId });

    ResultAssertionHelper.assertResultFailure(result);
    expect(orderScheduler.scheduleCheckout).not.toHaveBeenCalled();
  });
});
