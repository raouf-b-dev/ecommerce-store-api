// src/modules/Orders/presentation/controllers/Create-Order.controller.spec.ts
import { CreateOrderController } from './create-order.controller';
import { CreateOrderUseCase } from '../../../application/usecases/create-order/create-order.usecase';
import { OrderTestFactory } from '../../../testing/factories/order.factory';
import { CreateOrderDtoTestFactory } from '../../../testing/factories/create-order-dto.factory';
import { Result } from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ResultAssertionHelper } from '../../../../../testing';
import { PaymentMethodType } from '../../../../payments/domain';

describe('CreateOrderController', () => {
  let controller: CreateOrderController;
  let mockCreateOrderUseCase: jest.Mocked<CreateOrderUseCase>;

  beforeEach(() => {
    mockCreateOrderUseCase = {
      execute: jest.fn(),
    } as unknown as jest.Mocked<CreateOrderUseCase>;

    controller = new CreateOrderController(mockCreateOrderUseCase);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('handle', () => {
    it('should return success if Order is created', async () => {
      const createOrderDto = CreateOrderDtoTestFactory.createMockDto();
      const mockOrder = OrderTestFactory.createMockOrder();

      mockCreateOrderUseCase.execute.mockResolvedValue(
        Result.success(mockOrder),
      );

      const result = await controller.handle(createOrderDto);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toBe(mockOrder);

      expect(mockCreateOrderUseCase.execute).toHaveBeenCalledWith(
        createOrderDto,
      );
      expect(mockCreateOrderUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('should return Failure(ControllerError) if Order is not created', async () => {
      const createOrderDto = CreateOrderDtoTestFactory.createMockDto();

      const usecaseError = Result.failure(
        ErrorFactory.UseCaseError('Failed to save Order').error,
      );
      mockCreateOrderUseCase.execute.mockResolvedValue(usecaseError);

      const result = await controller.handle(createOrderDto);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Controller failed to create Order',
        ControllerError,
        usecaseError.error,
      );

      expect(mockCreateOrderUseCase.execute).toHaveBeenCalledWith(
        createOrderDto,
      );
      expect(mockCreateOrderUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('should return Failure(ControllerError) if usecase throws unexpected error', async () => {
      const createOrderDto = CreateOrderDtoTestFactory.createMockDto();
      const error = new Error('Database connection failed');

      mockCreateOrderUseCase.execute.mockRejectedValue(error);

      const result = await controller.handle(createOrderDto);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Unexpected controller error',
        ControllerError,
        error,
      );

      expect(mockCreateOrderUseCase.execute).toHaveBeenCalledWith(
        createOrderDto,
      );
      expect(mockCreateOrderUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('should create order with cash on delivery', async () => {
      const createOrderDto =
        CreateOrderDtoTestFactory.createCashOnDeliveryDto();
      const mockOrder = OrderTestFactory.createCashOnDeliveryOrder();

      mockCreateOrderUseCase.execute.mockResolvedValue(
        Result.success(mockOrder),
      );

      const result = await controller.handle(createOrderDto);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.paymentMethod).toBe(
        PaymentMethodType.CASH_ON_DELIVERY,
      );
    });

    it('should create order with credit card', async () => {
      const createOrderDto = CreateOrderDtoTestFactory.createCreditCardDto();
      const mockOrder = OrderTestFactory.createMockOrder();

      mockCreateOrderUseCase.execute.mockResolvedValue(
        Result.success(mockOrder),
      );

      const result = await controller.handle(createOrderDto);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.paymentMethod).toBe(PaymentMethodType.CREDIT_CARD);
    });

    it('should create order with multiple items', async () => {
      const createOrderDto = CreateOrderDtoTestFactory.createMultiItemDto([
        'PR1',
        'PR2',
        'PR3',
      ]);
      const mockOrder = OrderTestFactory.createMultiItemOrder(3);

      mockCreateOrderUseCase.execute.mockResolvedValue(
        Result.success(mockOrder),
      );

      const result = await controller.handle(createOrderDto);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.items).toHaveLength(3);
    });

    it('should create order with customer notes', async () => {
      const notes = 'Please ring doorbell';
      const createOrderDto =
        CreateOrderDtoTestFactory.createWithNotesDto(notes);
      const mockOrder = OrderTestFactory.createMockOrder({
        customerNotes: notes,
      });

      mockCreateOrderUseCase.execute.mockResolvedValue(
        Result.success(mockOrder),
      );

      const result = await controller.handle(createOrderDto);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.customerNotes).toBe(notes);
    });
  });
});
