import { Injectable } from '@nestjs/common';
import { CreatePaymentDto } from '../../dto/create-payment.dto';
import { PaymentResponseDto } from '../../dto/payment-response.dto';
import { CreatePaymentUseCase } from '../../../application/usecases/create-payment/create-payment.usecase';
import { Result } from '../../../../../core/domain/result';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { PaymentDtoMapper } from '../../mappers/payment-dto.mapper';

@Injectable()
export class CreatePaymentController {
  constructor(private readonly useCase: CreatePaymentUseCase) {}
  async handle(
    dto: CreatePaymentDto,
  ): Promise<Result<PaymentResponseDto, ControllerError>> {
    try {
      const result = await this.useCase.execute(dto);

      if (result.isFailure) {
        return ErrorFactory.ControllerError(
          'Failed to create payment',
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
