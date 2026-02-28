import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../../shared-kernel/domain/interfaces/base.usecase';
import {
  Result,
  isFailure,
} from '../../../../../../shared-kernel/domain/result';
import { UseCaseError } from '../../../../../../shared-kernel/domain/exceptions/usecase.error';
import { ErrorFactory } from '../../../../../../shared-kernel/domain/exceptions/error.factory';
import { PaymentRepository } from '../../../domain/repositories/payment.repository';
import { Payment } from '../../../domain/entities/payment';
import { PaymentGatewayFactory } from '../../../../secondary-adapters/gateways/payment-gateway.factory';
import { PaymentMethodType } from '../../../domain/value-objects/payment-method';

export interface CreatePaymentIntentDto {
  amount: number;
  currency: string;
  paymentMethod: PaymentMethodType;
  orderId: number;
  customerId: number;
  metadata?: Record<string, any>;
}

export interface CreatePaymentIntentResult {
  paymentId: number;
  clientSecret: string;
}

@Injectable()
export class CreatePaymentIntentUseCase extends UseCase<
  CreatePaymentIntentDto,
  CreatePaymentIntentResult,
  UseCaseError
> {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly paymentGatewayFactory: PaymentGatewayFactory,
  ) {
    super();
  }

  async execute(
    dto: CreatePaymentIntentDto,
  ): Promise<Result<CreatePaymentIntentResult, UseCaseError>> {
    try {
      // 1. Get Gateway
      const gateway = this.paymentGatewayFactory.getGateway(dto.paymentMethod);

      // 2. Create Payment Intent via Gateway
      const intentResult = await gateway.createPaymentIntent(
        dto.amount,
        dto.currency,
        dto.metadata,
      );

      if (isFailure(intentResult)) {
        return ErrorFactory.UseCaseError(
          `Failed to create payment intent: ${intentResult.error.message}`,
          intentResult.error,
        );
      }

      const { paymentIntentId, clientSecret } = intentResult.value;

      // 3. Create Payment Entity
      const payment = Payment.create(
        null,
        dto.orderId,
        dto.amount,
        dto.currency,
        dto.paymentMethod,
        dto.customerId,
        dto.metadata ? JSON.stringify(dto.metadata) : undefined,
      );

      // 4. Set Payment Intent Details
      const setIntentResult = payment.setPaymentIntent(
        paymentIntentId,
        clientSecret,
      );

      if (isFailure(setIntentResult)) {
        return ErrorFactory.UseCaseError(
          'Failed to set payment intent details',
          setIntentResult.error,
        );
      }

      // 5. Save Payment
      const saveResult = await this.paymentRepository.save(payment);

      if (isFailure(saveResult)) {
        return ErrorFactory.UseCaseError(
          'Failed to save payment',
          saveResult.error,
        );
      }

      return Result.success({
        paymentId: saveResult.value.id!,
        clientSecret,
      });
    } catch (error) {
      return ErrorFactory.UseCaseError(
        'Unexpected error creating payment intent',
        error,
      );
    }
  }
}
