import { Injectable } from '@nestjs/common';
import { AddAddressDto } from '../../dto/add-address.dto';
import { Result } from '../../../../../core/domain/result';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';

@Injectable()
export class AddAddressController {
  constructor() {}
  async handle(
    id: string,
    dto: AddAddressDto,
  ): Promise<Result<void, ControllerError>> {
    try {
      return Result.success(undefined);
    } catch (error) {
      return ErrorFactory.ControllerError('Unexpected Controller Error', error);
    }
  }
}
