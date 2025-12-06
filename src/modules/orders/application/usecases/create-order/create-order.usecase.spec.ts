// src/modules/Orders/application/usecases/CreateOrder/create-order.usecase.spec.ts
import { CreateOrderUseCase } from './create-order.usecase';
import { MockOrderRepository } from '../../../testing/mocks/order-repository.mock';
import { OrderTestFactory } from '../../../testing/factories/order.factory';
import { CreateOrderDtoTestFactory } from '../../../testing/factories/create-order-dto.factory';
import { OrderFactory } from '../../../domain/factories/order.factory';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ResultAssertionHelper } from '../../../../../testing';
import { Order } from '../../../domain/entities/order';
import { PaymentMethodType } from '../../../../payments/domain';

describe('CreateOrderUseCase', () => {
  let useCase: CreateOrderUseCase;
  let mockOrderRepository: MockOrderRepository;
  let orderFactory: OrderFactory;

  beforeEach(() => {
    mockOrderRepository = new MockOrderRepository();
    orderFactory = new OrderFactory();
    useCase = new CreateOrderUseCase(orderFactory, mockOrderRepository);
  });

  afterEach(() => {
    mockOrderRepository.reset();
  });

  describe('execute', () => {
    it('should return Success if order is created', async () => {
      const createOrderDto = CreateOrderDtoTestFactory.createMockDto();
      const mockOrder = Order.fromPrimitives(
        OrderTestFactory.createMockOrder(),
      );

      mockOrderRepository.mockSuccessfulSave(mockOrder);

      const result = await useCase.execute(createOrderDto);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toBe(mockOrder);

      const aggregatedDto = orderFactory.createFromDto(createOrderDto);
      expect(mockOrderRepository.save).toHaveBeenCalledWith(aggregatedDto);
      expect(mockOrderRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should return Failure(UseCaseError) if order is not created', async () => {
      const createOrderDto = CreateOrderDtoTestFactory.createMockDto();
      const repoError = ErrorFactory.RepositoryError('Failed to save Order');

      mockOrderRepository.save.mockResolvedValue(repoError);

      const result = await useCase.execute(createOrderDto);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to save Order',
        UseCaseError,
      );

      const aggregatedDto = orderFactory.createFromDto(createOrderDto);
      expect(mockOrderRepository.save).toHaveBeenCalledWith(aggregatedDto);
      expect(mockOrderRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should return Failure(UseCaseError) if repository throws unexpected error', async () => {
      const createOrderDto = CreateOrderDtoTestFactory.createMockDto();
      const repoError = new Error('Database connection failed');

      mockOrderRepository.save.mockRejectedValue(repoError);

      const result = await useCase.execute(createOrderDto);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Unexpected use case error',
        UseCaseError,
        repoError,
      );

      const aggregatedDto = orderFactory.createFromDto(createOrderDto);
      expect(mockOrderRepository.save).toHaveBeenCalledWith(aggregatedDto);
      expect(mockOrderRepository.save).toHaveBeenCalledTimes(1);
    });

    it('should create order with cash on delivery payment method', async () => {
      const createOrderDto =
        CreateOrderDtoTestFactory.createCashOnDeliveryDto();
      const mockOrder = OrderTestFactory.createCashOnDeliveryOrder();

      mockOrderRepository.mockSuccessfulSave(Order.fromPrimitives(mockOrder));

      const result = await useCase.execute(createOrderDto);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.paymentMethod).toBe(
        PaymentMethodType.CASH_ON_DELIVERY,
      );
    });

    it('should create order with multiple items', async () => {
      const createOrderDto = CreateOrderDtoTestFactory.createMultiItemDto([
        'PR1',
        'PR2',
        'PR3',
      ]);
      const mockOrder = OrderTestFactory.createMultiItemOrder(3);

      mockOrderRepository.mockSuccessfulSave(Order.fromPrimitives(mockOrder));

      const result = await useCase.execute(createOrderDto);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.items).toHaveLength(3);
    });
  });
});
