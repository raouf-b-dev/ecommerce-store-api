import { Injectable } from '@nestjs/common';
import { RecordCodPaymentDto } from '../../dto/record-cod-payment.dto';
import { RecordCodPaymentUseCase } from '../../../application/usecases/record-cod-payment/record-cod-payment.usecase';
import { PaymentResponseDto } from '../../dto/payment-response.dto';
import { Result } from '../../../../../core/domain/result';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { PaymentDtoMapper } from '../../mappers/payment-dto.mapper';

@Injectable()
export class RecordCodPaymentController {
  constructor(private readonly useCase: RecordCodPaymentUseCase) {}
  async handle(
    dto: RecordCodPaymentDto,
  ): Promise<Result<PaymentResponseDto, ControllerError>> {
    try {
      const result = await this.useCase.execute(dto);

      if (result.isFailure) {
        return ErrorFactory.ControllerError(
          'Failed to record COD payment',
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
