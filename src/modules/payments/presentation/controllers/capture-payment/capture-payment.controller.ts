import { Injectable } from '@nestjs/common';
import { CapturePaymentUseCase } from '../../../application/usecases/capture-payment/capture-payment.usecase';
import { PaymentResponseDto } from '../../dto/payment-response.dto';
import { Result } from '../../../../../core/domain/result';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { PaymentDtoMapper } from '../../mappers/payment-dto.mapper';

@Injectable()
export class CapturePaymentController {
  constructor(private readonly useCase: CapturePaymentUseCase) {}
  async handle(
    id: string,
  ): Promise<Result<PaymentResponseDto, ControllerError>> {
    try {
      const result = await this.useCase.execute(id);

      if (result.isFailure) {
        return ErrorFactory.ControllerError(
          'Failed to capture payment',
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
