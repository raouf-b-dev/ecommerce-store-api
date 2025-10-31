import { Injectable } from '@nestjs/common';
import { ProcessRefundDto } from '../../dto/process-refund.dto';
import { Result } from '../../../../../core/domain/result';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';

@Injectable()
export class ProcessRefundController {
  constructor() {}
  async handle(
    id: string,
    dto: ProcessRefundDto,
  ): Promise<Result<void, ControllerError>> {
    try {
      return Result.success(undefined);
    } catch (error) {
      return ErrorFactory.ControllerError('Unexpected Controller Error', error);
    }
  }
}
