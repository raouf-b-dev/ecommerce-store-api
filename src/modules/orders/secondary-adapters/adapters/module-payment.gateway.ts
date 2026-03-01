import { Injectable } from '@nestjs/common';
import {
  PaymentGateway,
  RecordCodPaymentInput,
  PaymentRecord,
} from '../../core/application/ports/payment.gateway';
import { RecordCodPaymentUseCase } from '../../../payments/core/application/usecases/record-cod-payment/record-cod-payment.usecase';
import { Result, isFailure } from '../../../../shared-kernel/domain/result';
import { InfrastructureError } from '../../../../shared-kernel/domain/exceptions/infrastructure-error';
import { ErrorFactory } from '../../../../shared-kernel/domain/exceptions/error.factory';

@Injectable()
export class ModulePaymentGateway implements PaymentGateway {
  constructor(
    private readonly recordCodPaymentUseCase: RecordCodPaymentUseCase,
  ) {}

  async recordCodPayment(
    input: RecordCodPaymentInput,
  ): Promise<Result<PaymentRecord, InfrastructureError>> {
    const result = await this.recordCodPaymentUseCase.execute({
      orderId: input.orderId,
      amountCollected: input.amountCollected,
      currency: input.currency,
      notes: input.notes,
      collectedBy: input.collectedBy,
    });

    if (isFailure(result)) {
      return ErrorFactory.InfrastructureError(
        'Failed to record COD payment',
        result.error,
      );
    }

    return Result.success({ id: result.value.id });
  }
}
