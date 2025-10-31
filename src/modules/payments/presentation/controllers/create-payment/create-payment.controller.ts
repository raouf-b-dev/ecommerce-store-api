import { Injectable } from '@nestjs/common';
import { CreatePaymentDto } from '../../dto/create-payment.dto';
import { Result } from '../../../../../core/domain/result';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';

@Injectable()
export class CreatePaymentController {
  constructor() {}
  async handle(dto: CreatePaymentDto): Promise<Result<void, ControllerError>> {
    try {
      return Result.success(undefined);
    } catch (error) {
      return ErrorFactory.ControllerError('Unexpected Controller Error', error);
    }
  }
}
