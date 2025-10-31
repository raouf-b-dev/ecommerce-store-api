import { Injectable } from '@nestjs/common';
import { UpdateAddressDto } from '../../dto/update-address.dto';
import { Result } from '../../../../../core/domain/result';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';

@Injectable()
export class UpdateAddressController {
  constructor() {}
  async handle(
    id: string,
    addressId: string,
    dto: UpdateAddressDto,
  ): Promise<Result<void, ControllerError>> {
    try {
      return Result.success(undefined);
    } catch (error) {
      return ErrorFactory.ControllerError('Unexpected Controller Error', error);
    }
  }
}
