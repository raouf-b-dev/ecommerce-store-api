import { Injectable } from '@nestjs/common';
import { Result } from '../../../../../core/domain/result';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { DeleteAddressUseCase } from '../../../application/usecases/delete-address/delete-address.usecase';

@Injectable()
export class DeleteAddressController {
  constructor(private readonly useCase: DeleteAddressUseCase) {}

  async handle(
    id: number,
    addressId: number,
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
