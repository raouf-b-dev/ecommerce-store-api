import { Test, TestingModule } from '@nestjs/testing';
import { GetCustomerController } from './get-customer.controller';
import { GetCustomerUseCase } from '../../../application/usecases/get-customer/get-customer.usecase';
import { CustomerTestFactory } from '../../../testing/factories/customer.factory';
import { Result } from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ResultAssertionHelper } from '../../../../../testing';

describe('GetCustomerController', () => {
  let controller: GetCustomerController;
  let useCase: jest.Mocked<GetCustomerUseCase>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GetCustomerController],
      providers: [
        {
          provide: GetCustomerUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<GetCustomerController>(GetCustomerController);
    useCase = module.get(GetCustomerUseCase);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handle', () => {
    it('should return success result with customer', async () => {
      const customerId = 123;
      const customerData = CustomerTestFactory.createMockCustomer({
        id: customerId,
      });

      useCase.execute.mockResolvedValue(Result.success(customerData as any));

      const result = await controller.handle(customerId);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.id).toBe(customerId);
      expect(useCase.execute).toHaveBeenCalledWith(customerId);
    });

    it('should return controller error if use case fails', async () => {
      const customerId = 123;
      const error = ErrorFactory.UseCaseError('Customer not found');

      useCase.execute.mockResolvedValue(error);

      const result = await controller.handle(customerId);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Customer not found',
        ControllerError,
      );
    });

    it('should return controller error if unexpected error occurs', async () => {
      const customerId = 123;
      const error = new Error('Unexpected error');

      useCase.execute.mockRejectedValue(error);

      const result = await controller.handle(customerId);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Unexpected Controller Error',
        ControllerError,
        error,
      );
    });
  });
});
