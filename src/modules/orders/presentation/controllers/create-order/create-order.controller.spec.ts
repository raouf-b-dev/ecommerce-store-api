// src/modules/Orders/presentation/controllers/Create-Order.controller.spec.ts
import { CreateOrderController } from './create-order.controller';
import { CreateOrderUseCase } from '../../../application/usecases/create-order/create-order.usecase';
import { OrderTestFactory } from '../../../testing/factories/order.factory';
import { CreateOrderDtoTestFactory } from '../../../testing/factories/create-order-dto.factory';
import {
  isFailure,
  isSuccess,
  Result,
} from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ControllerError } from '../../../../../core/errors/controller.error';

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

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value).toBe(mockOrder);
      }
      expect(mockCreateOrderUseCase.execute).toHaveBeenCalledWith(
        createOrderDto,
      );
      expect(mockCreateOrderUseCase.execute).toHaveBeenCalledTimes(1);
    });

    it('should return Failure(ControllerError) if Order is not created', async () => {
      const createOrderDto = CreateOrderDtoTestFactory.createMockDto();

      mockCreateOrderUseCase.execute.mockResolvedValue(
        Result.failure(ErrorFactory.UseCaseError('Failed to save Order').error),
      );

      const result = await controller.handle(createOrderDto);

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(ControllerError);
        expect(result.error.message).toBe('Controller failed to create Order');
        expect(result.error.cause?.message).toBe('Failed to save Order');
      }

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

      expect(isFailure(result)).toBe(true);
      if (isFailure(result)) {
        expect(result.error).toBeInstanceOf(ControllerError);
        expect(result.error.message).toBe('Unexpected controller error');
        expect(result.error.cause).toBe(error);
      }

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

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value.paymentInfo.method).toBe('cash_on_delivery');
      }
    });

    it('should create order with credit card', async () => {
      const createOrderDto = CreateOrderDtoTestFactory.createCreditCardDto();
      const mockOrder = OrderTestFactory.createMockOrder();

      mockCreateOrderUseCase.execute.mockResolvedValue(
        Result.success(mockOrder),
      );

      const result = await controller.handle(createOrderDto);

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value.paymentInfo.method).toBe('credit_card');
      }
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

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value.items).toHaveLength(3);
      }
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

      expect(isSuccess(result)).toBe(true);
      if (isSuccess(result)) {
        expect(result.value.customerNotes).toBe(notes);
      }
    });
  });
});
