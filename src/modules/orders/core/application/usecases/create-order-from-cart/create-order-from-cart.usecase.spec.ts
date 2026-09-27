import { Test, TestingModule } from '@nestjs/testing';
import { CreateOrderFromCartUseCase } from './create-order-from-cart.usecase';
import { OrderRepository } from '../../../domain/repositories/order-repository';
import { OrderFactory } from '../../../domain/factories/order.factory';
import { CART_GATEWAY } from '../../../../order.token';
import { Result } from '../../../../../../shared-kernel/domain/result';
import { ResultAssertionHelper } from '../../../../../../testing/helpers/result-assertion.helper';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import {
  MockCartGateway,
  MockOrderRepository,
  OrderDtoTestFactory,
  OrderTestFactory,
} from 'src/modules/orders/testing';

describe('CreateOrderFromCartUseCase', () => {
  let useCase: CreateOrderFromCartUseCase;
  let orderRepository: MockOrderRepository;
  let orderFactory: jest.Mocked<OrderFactory>;
  let cartGateway: MockCartGateway;

  beforeEach(async () => {
    orderRepository = new MockOrderRepository();
    cartGateway = new MockCartGateway();

    const mockOrderFactory = {
      createFromCart: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreateOrderFromCartUseCase,
        { provide: OrderRepository, useValue: orderRepository },
        { provide: OrderFactory, useValue: mockOrderFactory },
        { provide: CART_GATEWAY, useValue: cartGateway },
      ],
    }).compile();

    useCase = module.get<CreateOrderFromCartUseCase>(
      CreateOrderFromCartUseCase,
    );
    orderFactory = module.get(OrderFactory);
  });

  it('should be defined', () => {
    expect(useCase).toBeDefined();
  });

  it('should create an order successfully', async () => {
    const cartId = 1;
    const userId = 1;
    const cartInfo = OrderDtoTestFactory.createCheckoutCartInfo({
      id: cartId,
      userId,
      items: [
        OrderDtoTestFactory.createCheckoutCartItem({
          productId: 101,
          productName: 'Test Product',
          price: 50,
          quantity: 2,
        }),
      ],
    });
    const order = OrderTestFactory.createDomainOrder({ id: 1 });

    cartGateway.getCart.mockResolvedValue(Result.success(cartInfo));
    orderFactory.createFromCart.mockReturnValue(order);
    orderRepository.save.mockResolvedValue(Result.success(order));

    const dto = OrderDtoTestFactory.createCreateOrderFromCartInput({
      cartId,
      userId,
    });

    const result = await useCase.execute(dto);

    expect(cartGateway.getCart).toHaveBeenCalledWith(cartId);
    expect(orderFactory.createFromCart).toHaveBeenCalled();
    expect(orderRepository.save).toHaveBeenCalledWith(order);
    ResultAssertionHelper.assertResultSuccess(result);
  });

  it('should fail if cart fetch fails', async () => {
    const cartId = 1;
    const error = new UseCaseError('Cart fetch failed');
    cartGateway.getCart.mockResolvedValue(Result.failure(error));

    const dto = OrderDtoTestFactory.createCreateOrderFromCartInput({
      cartId,
      userId: 1,
    });

    const result = await useCase.execute(dto);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Failed to fetch cart',
      UseCaseError,
    );
  });

  it('should fail if cart is empty', async () => {
    const cartId = 1;
    const emptyCartInfo = OrderDtoTestFactory.createCheckoutCartInfo({
      id: cartId,
      userId: 1,
      items: [],
    });

    cartGateway.getCart.mockResolvedValue(Result.success(emptyCartInfo));

    const dto = OrderDtoTestFactory.createCreateOrderFromCartInput({
      cartId,
      userId: 1,
    });

    const result = await useCase.execute(dto);

    ResultAssertionHelper.assertResultFailure(
      result,
      'Cannot create order from empty cart',
      UseCaseError,
    );
  });
});
