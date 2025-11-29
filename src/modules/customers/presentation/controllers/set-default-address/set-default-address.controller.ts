import { Injectable } from '@nestjs/common';
import { Result } from '../../../../../core/domain/result';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { SetDefaultAddressUseCase } from '../../../application/usecases/set-default-address/set-default-address.usecase';

@Injectable()
export class SetDefaultAddressController {
  constructor(private readonly useCase: SetDefaultAddressUseCase) {}

  async handle(
    id: string,
    addressId: string,
  ): Promise<Result<void, ControllerError>> {
    try {
      const result = await this.useCase.execute({
        customerId: id,
        addressId,
      });

      if (result.isFailure) {
        return ErrorFactory.ControllerError(result.error.message, result.error);
      }

      return Result.success(undefined);
    } catch (error) {
      return ErrorFactory.ControllerError('Unexpected Controller Error', error);
    }
  }
}
