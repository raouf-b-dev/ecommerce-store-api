import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  Result,
  isFailure,
} from '../../../../../../shared-kernel/domain/result';
import { AppError } from '../../../../../../shared-kernel/domain/exceptions/app.error';
import { PaymentRepository } from '../../../domain/repositories/payment.repository';
import { IPayment } from '../../../domain/interfaces/payment.interface';
import { DomainEventPublisher } from '../../../../../../shared-kernel/domain/interfaces/domain-event-publisher';

@Injectable()
export class CapturePaymentUseCase extends UseCase<number, IPayment, AppError> {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly domainEventPublisher: DomainEventPublisher,
  ) {
    super();
  }

  async execute(id: number): Promise<Result<IPayment, AppError>> {
    const paymentResult = await this.paymentRepository.findById(id);
    if (isFailure(paymentResult)) return paymentResult;

    const payment = paymentResult.value;
    const captureResult = payment.capture();
    if (isFailure(captureResult)) return captureResult;

    const saveResult = await this.paymentRepository.update(payment);
    if (isFailure(saveResult)) return saveResult;

    this.domainEventPublisher.publish('payment.captured', {
      paymentId: payment.id!,
    });

    return Result.success(saveResult.value.toPrimitives());
  }
}
