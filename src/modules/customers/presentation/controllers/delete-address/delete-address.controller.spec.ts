import { Test, TestingModule } from '@nestjs/testing';
import { DeleteAddressController } from './delete-address.controller';
import { DeleteAddressUseCase } from '../../../application/usecases/delete-address/delete-address.usecase';
import { Result } from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ResultAssertionHelper } from '../../../../../testing';

describe('DeleteAddressController', () => {
  let controller: DeleteAddressController;
  let useCase: jest.Mocked<DeleteAddressUseCase>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DeleteAddressController],
      providers: [
        {
          provide: DeleteAddressUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<DeleteAddressController>(DeleteAddressController);
    useCase = module.get(DeleteAddressUseCase);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handle', () => {
    it('should return success result when address is deleted', async () => {
      const customerId = 123;
      const addressId = 123;

      useCase.execute.mockResolvedValue(Result.success(undefined));

      const result = await controller.handle(customerId, addressId);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(useCase.execute).toHaveBeenCalledWith({ customerId, addressId });
    });

    it('should return controller error if use case fails', async () => {
      const customerId = 123;
      const addressId = 123;
      const error = ErrorFactory.UseCaseError('Address not found');

      useCase.execute.mockResolvedValue(error);

      const result = await controller.handle(customerId, addressId);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Address not found',
        ControllerError,
      );
    });

    it('should return controller error if unexpected error occurs', async () => {
      const customerId = 123;
      const addressId = 123;
      const error = new Error('Unexpected error');

      useCase.execute.mockRejectedValue(error);

      const result = await controller.handle(customerId, addressId);

      ResultAssertionHelper.assertResultFailure(
        result,
        'Unexpected Controller Error',
        ControllerError,
        error,
      );
    });
  });
});
