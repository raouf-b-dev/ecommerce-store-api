import { Test, TestingModule } from '@nestjs/testing';
import { SetDefaultAddressController } from './set-default-address.controller';
import { SetDefaultAddressUseCase } from '../../../application/usecases/set-default-address/set-default-address.usecase';
import { Result } from '../../../../../core/domain/result';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ResultAssertionHelper } from '../../../../../testing';

describe('SetDefaultAddressController', () => {
  let controller: SetDefaultAddressController;
  let useCase: jest.Mocked<SetDefaultAddressUseCase>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SetDefaultAddressController],
      providers: [
        {
          provide: SetDefaultAddressUseCase,
          useValue: {
            execute: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get<SetDefaultAddressController>(
      SetDefaultAddressController,
    );
    useCase = module.get(SetDefaultAddressUseCase);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('handle', () => {
    it('should return success result when address is set as default', async () => {
      const customerId = 'cust-123';
      const addressId = 'addr-123';

      useCase.execute.mockResolvedValue(Result.success(undefined));

      const result = await controller.handle(customerId, addressId);

      ResultAssertionHelper.assertResultSuccess(result);
      expect(useCase.execute).toHaveBeenCalledWith({ customerId, addressId });
    });

    it('should return controller error if use case fails', async () => {
      const customerId = 'cust-123';
      const addressId = 'addr-123';
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
      const customerId = 'cust-123';
      const addressId = 'addr-123';
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
