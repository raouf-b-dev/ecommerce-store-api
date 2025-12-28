import { Test, TestingModule } from '@nestjs/testing';
import { AddAddressController } from './add-address.controller';
import { AddAddressUseCase } from '../../../application/usecases/add-address/add-address.usecase';
import { CustomerDtoTestFactory } from '../../../testing/factories/customer-dto.test.factory';
import { CustomerTestFactory } from '../../../testing/factories/customer.factory';
import { Result } from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ResultAssertionHelper } from '../../../../../testing';

describe('AddAddressController', () => {
  let controller: AddAddressController;
  let useCase: jest.Mocked<AddAddressUseCase>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AddAddressController],
      providers: [
        {
          provide: AddAddressUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<AddAddressController>(AddAddressController);
    useCase = module.get(AddAddressUseCase);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handle', () => {
    it('should return success result with address response', async () => {
      const customerId = 123;
      const dto = CustomerDtoTestFactory.createAddAddressDto();
      const addressData = CustomerTestFactory.createMockAddress({ ...dto });

      useCase.execute.mockResolvedValue(Result.success(addressData));

      const result = await controller.handle(customerId, dto);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.street).toBe(dto.street);
      expect(useCase.execute).toHaveBeenCalledWith({ customerId, dto });
    });

    it('should return controller error if use case fails', async () => {
      const customerId = 123;
      const dto = CustomerDtoTestFactory.createAddAddressDto();
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
      const customerId = 123;
      const dto = CustomerDtoTestFactory.createAddAddressDto();
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
