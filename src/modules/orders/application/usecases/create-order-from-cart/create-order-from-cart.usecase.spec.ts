import { Test, TestingModule } from '@nestjs/testing';
import { CreateOrderFromCartUseCase } from './create-order-from-cart.usecase';
import { OrderRepository } from '../../../domain/repositories/order-repository';
import { OrderFactory } from '../../../domain/factories/order.factory';
import { CartGateway } from '../../ports/cart.gateway';
import { CART_GATEWAY } from '../../../order.token';
import { Result } from '../../../../../core/domain/result';
import { Cart } from '../../../../carts/domain/entities/cart';
import { CartTestFactory } from '../../../../carts/testing/factories/cart.factory';
import { PaymentMethodType } from '../../../../payments/domain';
import { ShippingAddressProps } from '../../../domain/value-objects/shipping-address';
import { ResultAssertionHelper } from '../../../../../testing/helpers/result-assertion.helper';
import { UseCaseError } from '../../../../../core/errors/usecase.error';

describe('CreateOrderFromCartUseCase', () => {
  let useCase: CreateOrderFromCartUseCase;
  let orderRepository: jest.Mocked<OrderRepository>;
  let orderFactory: jest.Mocked<OrderFactory>;
  let cartGateway: jest.Mocked<CartGateway>;

  const mockShippingAddress: ShippingAddressProps = {
    id: 1,
    firstName: 'John',
    lastName: 'Doe',
    street: '123 Main St',
    street2: 'Apt 4B',
    city: 'New York',
    state: 'NY',
    postalCode: '10001',
    country: 'USA',
    phone: '555-1234',
    deliveryInstructions: 'Leave at front desk',
  };

  beforeEach(async () => {
    const mockOrderRepository = {
      save: jest.fn(),
    };

    const mockOrderFactory = {
      createFromCart: jest.fn(),
    };

    const mockCartGateway = {
      getCart: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateOrderFromCartUseCase,
        { provide: OrderRepository, useValue: mockOrderRepository },
        { provide: OrderFactory, useValue: mockOrderFactory },
        { provide: CART_GATEWAY, useValue: mockCartGateway },
      ],
    }).compile();

    useCase = module.get<CreateOrderFromCartUseCase>(
      CreateOrderFromCartUseCase,
    );
    orderRepository = module.get(OrderRepository);
    orderFactory = module.get(OrderFactory);
    cartGateway = module.get(CART_GATEWAY);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should create an order successfully', async () => {
    // Arrange
    const cartId = 1;
    const userId = 1;
    const cartData = CartTestFactory.createCartWithItems(3, { id: cartId });
    const cart = Cart.fromPrimitives(cartData);
    const order = { id: 1 } as any; // Mock order

    cartGateway.getCart.mockResolvedValue(Result.success(cart));
    orderFactory.createFromCart.mockReturnValue(order);
    orderRepository.save.mockResolvedValue(Result.success(order));

    const dto = {
      cartId,
      userId,
      shippingAddress: mockShippingAddress,
      paymentMethod: PaymentMethodType.CREDIT_CARD,
    };

    // Act
    const result = await useCase.execute(dto);

    // Assert
    expect(cartGateway.getCart).toHaveBeenCalledWith(cartId);
    expect(orderFactory.createFromCart).toHaveBeenCalled();
    expect(orderRepository.save).toHaveBeenCalledWith(order);
    ResultAssertionHelper.assertResultSuccess(result);
  });

  it('should fail if cart fetch fails', async () => {
    // Arrange
    const cartId = 1;
    const error = new UseCaseError('Cart fetch failed');
    cartGateway.getCart.mockResolvedValue(Result.failure(error));

    const dto = {
      cartId,
      userId: 1,
      shippingAddress: mockShippingAddress,
      paymentMethod: PaymentMethodType.CREDIT_CARD,
    };

    // Act
    const result = await useCase.execute(dto);

    // Assert
    ResultAssertionHelper.assertResultFailure(
      result,
      'Failed to fetch cart',
      UseCaseError,
    );
  });

  it('should fail if cart is empty', async () => {
    // Arrange
    const cartId = 1;
    const cartData = CartTestFactory.createEmptyCart({ id: cartId });
    const cart = Cart.fromPrimitives(cartData);

    cartGateway.getCart.mockResolvedValue(Result.success(cart));

    const dto = {
      cartId,
      userId: 1,
      shippingAddress: mockShippingAddress,
      paymentMethod: PaymentMethodType.CREDIT_CARD,
    };

    // Act
    const result = await useCase.execute(dto);

    // Assert
    ResultAssertionHelper.assertResultFailure(
      result,
      'Cannot create order from empty cart',
      UseCaseError,
    );
  });
});
