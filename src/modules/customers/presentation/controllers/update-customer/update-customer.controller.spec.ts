import { Test, TestingModule } from '@nestjs/testing';
import { UpdateCustomerController } from './update-customer.controller';
import { UpdateCustomerUseCase } from '../../../application/usecases/update-customer/update-customer.usecase';
import { CustomerDtoTestFactory } from '../../../testing/factories/customer-dto.test.factory';
import { CustomerTestFactory } from '../../../testing/factories/customer.factory';
import { Result } from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ResultAssertionHelper } from '../../../../../testing';

describe('UpdateCustomerController', () => {
  let controller: UpdateCustomerController;
  let useCase: jest.Mocked<UpdateCustomerUseCase>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UpdateCustomerController],
      providers: [
        {
          provide: UpdateCustomerUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UpdateCustomerController>(UpdateCustomerController);
    useCase = module.get(UpdateCustomerUseCase);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handle', () => {
    it('should return success result with updated customer', async () => {
      const customerId = 'cust-123';
      const dto = CustomerDtoTestFactory.createUpdateCustomerDto();
      const customerData = CustomerTestFactory.createMockCustomer({
        id: customerId,
        ...dto,
      });

      useCase.execute.mockResolvedValue(Result.success(customerData as any));

      const result = await controller.handle(customerId, dto);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.id).toBe(customerId);
      expect(useCase.execute).toHaveBeenCalledWith({ id: customerId, dto });
    });

    it('should return controller error if use case fails', async () => {
      const customerId = 'cust-123';
      const dto = CustomerDtoTestFactory.createUpdateCustomerDto();
      const error = ErrorFactory.UseCaseError('Customer not found');

      useCase.execute.mockResolvedValue(error);

      const result = await controller.handle(customerId, dto);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Customer not found',
        ControllerError,
      );
    });

    it('should return controller error if unexpected error occurs', async () => {
      const customerId = 'cust-123';
      const dto = CustomerDtoTestFactory.createUpdateCustomerDto();
      const error = new Error('Unexpected error');

      useCase.execute.mockRejectedValue(error);

      const result = await controller.handle(customerId, dto);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Unexpected Controller Error',
        ControllerError,
        error,
      );
    });
  });
});
