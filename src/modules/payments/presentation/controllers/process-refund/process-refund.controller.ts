import { Injectable } from '@nestjs/common';
import { ProcessRefundDto } from '../../dto/process-refund.dto';
import { ProcessRefundUseCase } from '../../../application/usecases/process-refund/process-refund.usecase';
import { PaymentResponseDto } from '../../dto/payment-response.dto';
import { Result } from '../../../../../core/domain/result';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { PaymentDtoMapper } from '../../mappers/payment-dto.mapper';

@Injectable()
export class ProcessRefundController {
  constructor(private readonly useCase: ProcessRefundUseCase) {}
  async handle(
    id: string,
    dto: ProcessRefundDto,
  ): Promise<Result<PaymentResponseDto, ControllerError>> {
    try {
      const result = await this.useCase.execute({ id, dto });

      if (result.isFailure) {
        return ErrorFactory.ControllerError(
          'Failed to process refund',
          result.error,
        );
      }

      const payment = result.value;
      const response = PaymentDtoMapper.toResponse(payment);

      return Result.success(response);
    } catch (error) {
      return ErrorFactory.ControllerError('Unexpected Controller Error', error);
    }
  }
}
