import { Test, TestingModule } from '@nestjs/testing';
import { ListCustomersController } from './list-customers.controller';
import { ListCustomersUseCase } from '../../../application/usecases/list-customers/list-customers.usecase';
import { CustomerDtoTestFactory } from '../../../testing/factories/customer-dto.test.factory';
import { CustomerTestFactory } from '../../../testing/factories/customer.factory';
import { Result } from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ResultAssertionHelper } from '../../../../../testing';

describe('ListCustomersController', () => {
  let controller: ListCustomersController;
  let useCase: jest.Mocked<ListCustomersUseCase>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ListCustomersController],
      providers: [
        {
          provide: ListCustomersUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<ListCustomersController>(ListCustomersController);
    useCase = module.get(ListCustomersUseCase);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handle', () => {
    it('should return success result with paginated response', async () => {
      const query = CustomerDtoTestFactory.createListCustomersQueryDto();
      const customerData = CustomerTestFactory.createMockCustomer();

      useCase.execute.mockResolvedValue(Result.success([customerData]));

      const result = await controller.handle(query);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value).toEqual([customerData]);
      expect(useCase.execute).toHaveBeenCalledWith(query);
    });

    it('should return controller error if use case fails', async () => {
      const query = CustomerDtoTestFactory.createListCustomersQueryDto();
      const error = ErrorFactory.UseCaseError('Failed to list customers');

      useCase.execute.mockResolvedValue(error);

      const result = await controller.handle(query);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Failed to list customers',
        ControllerError,
      );
    });

    it('should return controller error if unexpected error occurs', async () => {
      const query = CustomerDtoTestFactory.createListCustomersQueryDto();
      const error = new Error('Unexpected error');

      useCase.execute.mockRejectedValue(error);

      const result = await controller.handle(query);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Unexpected Controller Error',
        ControllerError,
        error,
      );
    });
  });
});
