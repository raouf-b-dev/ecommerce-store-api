import { Test, TestingModule } from '@nestjs/testing';
import { DeleteCustomerController } from './delete-customer.controller';
import { DeleteCustomerUseCase } from '../../../application/usecases/delete-customer/delete-customer.usecase';
import { Result } from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ResultAssertionHelper } from '../../../../../testing';

describe('DeleteCustomerController', () => {
  let controller: DeleteCustomerController;
  let useCase: jest.Mocked<DeleteCustomerUseCase>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeleteCustomerController],
      providers: [
        {
          provide: DeleteCustomerUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<DeleteCustomerController>(DeleteCustomerController);
    useCase = module.get(DeleteCustomerUseCase);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handle', () => {
    it('should return success result when customer is deleted', async () => {
      const customerId = 'cust-123';

      useCase.execute.mockResolvedValue(Result.success(undefined));

      const result = await controller.handle(customerId);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(useCase.execute).toHaveBeenCalledWith(customerId);
    });

    it('should return controller error if use case fails', async () => {
      const customerId = 'cust-123';
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
      const customerId = 'cust-123';
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
