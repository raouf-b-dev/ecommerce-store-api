import { Injectable } from '@nestjs/common';
import { RecordCodPaymentDto } from '../../dto/record-cod-payment.dto';
import { Result } from '../../../../../core/domain/result';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';

@Injectable()
export class RecordCodPaymentController {
  constructor() {}
  async handle(
    dto: RecordCodPaymentDto,
  ): Promise<Result<void, ControllerError>> {
    try {
      return Result.success(undefined);
    } catch (error) {
      return ErrorFactory.ControllerError('Unexpected Controller Error', error);
    }
  }
}
