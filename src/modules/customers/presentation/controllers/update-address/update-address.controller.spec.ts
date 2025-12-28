import { Test, TestingModule } from '@nestjs/testing';
import { UpdateAddressController } from './update-address.controller';
import { UpdateAddressUseCase } from '../../../application/usecases/update-address/update-address.usecase';
import { CustomerDtoTestFactory } from '../../../testing/factories/customer-dto.test.factory';
import { CustomerTestFactory } from '../../../testing/factories/customer.factory';
import { Result } from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ResultAssertionHelper } from '../../../../../testing';

describe('UpdateAddressController', () => {
  let controller: UpdateAddressController;
  let useCase: jest.Mocked<UpdateAddressUseCase>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UpdateAddressController],
      providers: [
        {
          provide: UpdateAddressUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<UpdateAddressController>(UpdateAddressController);
    useCase = module.get(UpdateAddressUseCase);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handle', () => {
    it('should return success result with updated address', async () => {
      const customerId = 123;
      const addressId = 123;
      const dto = CustomerDtoTestFactory.createUpdateAddressDto();
      const addressData = CustomerTestFactory.createMockAddress({
        id: addressId,
        ...dto,
      });

      useCase.execute.mockResolvedValue(Result.success(addressData));

      const result = await controller.handle(customerId, addressId, dto);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(result.value.id).toBe(addressId);
      expect(useCase.execute).toHaveBeenCalledWith({
        customerId,
        addressId,
        dto,
      });
    });

    it('should return controller error if use case fails', async () => {
      const customerId = 123;
      const addressId = 123;
      const dto = CustomerDtoTestFactory.createUpdateAddressDto();
      const error = ErrorFactory.UseCaseError('Address not found');

      useCase.execute.mockResolvedValue(error);

      const result = await controller.handle(customerId, addressId, dto);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Address not found',
        ControllerError,
      );
    });

    it('should return controller error if unexpected error occurs', async () => {
      const customerId = 123;
      const addressId = 123;
      const dto = CustomerDtoTestFactory.createUpdateAddressDto();
      const error = new Error('Unexpected error');

      useCase.execute.mockRejectedValue(error);

      const result = await controller.handle(customerId, addressId, dto);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Unexpected Controller Error',
        ControllerError,
        error,
      );
    });
  });
});
