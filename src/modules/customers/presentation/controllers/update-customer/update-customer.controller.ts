import { Injectable } from '@nestjs/common';
import { UpdateCustomerDto } from '../../dto/update-customer.dto';
import { Result } from '../../../../../core/domain/result';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';

@Injectable()
export class UpdateCustomerController {
  constructor() {}
  async handle(
    id: string,
    dto: UpdateCustomerDto,
  ): Promise<Result<void, ControllerError>> {
    try {
      return Result.success(undefined);
    } catch (error) {
      return ErrorFactory.ControllerError('Unexpected Controller Error', error);
    }
  }
}
