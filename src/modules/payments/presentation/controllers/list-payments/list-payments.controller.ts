import { Injectable } from '@nestjs/common';
import { ListPaymentsQueryDto } from '../../dto/list-payments-query.dto';
import { ListPaymentsUseCase } from '../../../application/usecases/list-payments/list-payments.usecase';
import { PaymentResponseDto } from '../../dto/payment-response.dto';
import { Result } from '../../../../../core/domain/result';
import { ControllerError } from '../../../../../core/errors/controller.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { PaymentDtoMapper } from '../../mappers/payment-dto.mapper';

@Injectable()
export class ListPaymentsController {
  constructor(private readonly useCase: ListPaymentsUseCase) {}
  async handle(
    query: ListPaymentsQueryDto,
  ): Promise<Result<PaymentResponseDto[], ControllerError>> {
    try {
      const result = await this.useCase.execute(query);

      if (result.isFailure) {
        return ErrorFactory.ControllerError(
          'Failed to list payments',
          result.error,
        );
      }

      const payments = result.value;
      const response = PaymentDtoMapper.toResponseList(payments);

      return Result.success(response);
    } catch (error) {
      return ErrorFactory.ControllerError('Unexpected Controller Error', error);
    }
  }
}
