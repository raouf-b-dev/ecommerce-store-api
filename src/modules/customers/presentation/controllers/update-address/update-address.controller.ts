import { Injectable } from '@nestjs/common';
import { UpdateAddressDto } from '../../dto/update-address.dto';
import { Result } from '../../../../../core/domain/result';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { UpdateAddressUseCase } from '../../../application/usecases/update-address/update-address.usecase';
import { IAddress } from '../../../domain/interfaces/address.interface';

@Injectable()
export class UpdateAddressController {
  constructor(private readonly useCase: UpdateAddressUseCase) {}

  async handle(
    id: number,
    addressId: number,
    dto: UpdateAddressDto,
  ): Promise<Result<IAddress, ControllerError>> {
    try {
      const result = await this.useCase.execute({
        customerId: id,
        addressId,
        dto,
      });

      if (result.isFailure) {
        return ErrorFactory.ControllerError(result.error.message, result.error);
      }

      return Result.success(result.value);
    } catch (error) {
      return ErrorFactory.ControllerError('Unexpected Controller Error', error);
    }
  }
}
