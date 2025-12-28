import { Injectable } from '@nestjs/common';
import { AddAddressDto } from '../../dto/add-address.dto';
import { Result } from '../../../../../core/domain/result';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { AddAddressUseCase } from '../../../application/usecases/add-address/add-address.usecase';
import { IAddress } from '../../../domain/interfaces/address.interface';

@Injectable()
export class AddAddressController {
  constructor(private readonly useCase: AddAddressUseCase) {}

  async handle(
    id: number,
    dto: AddAddressDto,
  ): Promise<Result<IAddress, ControllerError>> {
    try {
      const result = await this.useCase.execute({ customerId: id, dto });

      if (result.isFailure) {
        return ErrorFactory.ControllerError(result.error.message, result.error);
      }

      return Result.success(result.value);
    } catch (error) {
      return ErrorFactory.ControllerError('Unexpected Controller Error', error);
    }
  }
}
