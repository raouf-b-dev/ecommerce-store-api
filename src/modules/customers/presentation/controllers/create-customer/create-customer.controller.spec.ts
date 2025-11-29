import { Test, TestingModule } from '@nestjs/testing';
import { CreateCustomerController } from './create-customer.controller';
import { CreateCustomerUseCase } from '../../../application/usecases/create-customer/create-customer.usecase';
import { CustomerDtoTestFactory } from '../../../testing/factories/customer-dto.test.factory';
import { CustomerTestFactory } from '../../../testing/factories/customer.factory';
import { Customer } from '../../../domain/entities/customer';
import { Result } from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ResultAssertionHelper } from '../../../../../testing';

describe('CreateCustomerController', () => {
  let controller: CreateCustomerController;
  let useCase: jest.Mocked<CreateCustomerUseCase>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CreateCustomerController],
      providers: [
        {
          provide: CreateCustomerUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<CreateCustomerController>(CreateCustomerController);
    useCase = module.get(CreateCustomerUseCase);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handle', () => {
    it('should return success result with customer response', async () => {
      const dto = CustomerDtoTestFactory.createCreateCustomerDto();
      const customerData = CustomerTestFactory.createMockCustomer();
      const customer = Customer.fromPrimitives(customerData as any);

      useCase.execute.mockResolvedValue(Result.success(customer));

      const result = await controller.handle(dto);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.id).toBe(customer.id);
      expect(result.value.email).toBe(customer.email);
      expect(useCase.execute).toHaveBeenCalledWith(dto);
    });

    it('should return controller error if use case fails', async () => {
      const dto = CustomerDtoTestFactory.createCreateCustomerDto();
      const error = ErrorFactory.UseCaseError('Use case failed');

      useCase.execute.mockResolvedValue(error);

      const result = await controller.handle(dto);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Use case failed',
        ControllerError,
      );
    });

    it('should return controller error if unexpected error occurs', async () => {
      const dto = CustomerDtoTestFactory.createCreateCustomerDto();
      const error = new Error('Unexpected error');

      useCase.execute.mockRejectedValue(error);

      const result = await controller.handle(dto);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Unexpected Controller Error',
        ControllerError,
        error,
      );
    });
  });
});
