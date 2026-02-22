import { Injectable } from '@nestjs/common';
import { UseCase } from '../../../../../core/application/use-cases/base.usecase';
import { Result, isFailure } from '../../../../../core/domain/result';
import { UseCaseError } from '../../../../../core/errors/usecase.error';
import { ErrorFactory } from '../../../../../core/errors/error.factory';
import { PaymentRepository } from '../../../domain/repositories/payment.repository';
import { CreatePaymentDto } from '../../../presentation/dto/create-payment.dto';
import { Payment } from '../../../domain/entities/payment';
import { PaymentGatewayFactory } from '../../../infrastructure/gateways/payment-gateway.factory';
import { PaymentStatusType } from '../../../domain/value-objects/payment-status';
import { PaymentDtoMapper } from '../../../presentation/mappers/payment-dto.mapper';
import { PaymentResponseDto } from '../../../presentation/dto/payment-response.dto';

@Injectable()
export class CreatePaymentUseCase extends UseCase<
  CreatePaymentDto,
  PaymentResponseDto,
  UseCaseError
> {
  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly paymentGatewayFactory: PaymentGatewayFactory,
  ) {
    super();
  }

  async execute(
    dto: CreatePaymentDto,
  ): Promise<Result<PaymentResponseDto, UseCaseError>> {
    try {
      // 1. Get Gateway
      const gateway = this.paymentGatewayFactory.getGateway(dto.paymentMethod);

      // 2. Authorize Payment
      const authResult = await gateway.authorize(
        dto.amount,
        dto.currency,
        dto.paymentMethodDetails
          ? JSON.stringify(dto.paymentMethodDetails)
          : undefined,
      );

      if (isFailure(authResult)) {
        return ErrorFactory.UseCaseError(
          `Payment authorization failed: ${authResult.error.message}`,
          authResult.error,
        );
      }

      const paymentResult = authResult.value;

      // 3. Create Payment Entity
      const payment = Payment.create(
        null,
        dto.orderId,
        dto.amount,
        dto.currency,
        dto.paymentMethod,
        dto.customerId,
        dto.paymentMethodDetails
          ? JSON.stringify(dto.paymentMethodDetails)
          : undefined,
      );

      // Update status and transaction ID from gateway result
      if (paymentResult.success) {
        if (paymentResult.transactionId) {
          // Map status
          if (paymentResult.status === PaymentStatusType.AUTHORIZED) {
            payment.authorize(paymentResult.transactionId);
          } else if (paymentResult.status === PaymentStatusType.CAPTURED) {
            payment.authorize(paymentResult.transactionId); // Must authorize first if pending
            payment.capture();
          } else if (paymentResult.status === PaymentStatusType.COMPLETED) {
            payment.complete(paymentResult.transactionId);
          } else if (
            paymentResult.status === PaymentStatusType.NOT_REQUIRED_YET
          ) {
            // Do nothing, stays pending or specific status for COD?
            // COD createCOD sets it to NOT_REQUIRED_YET.
            // If we used Payment.create, it's PENDING.
            // We might need to handle COD specifically or just leave it PENDING/AUTHORIZED depending on flow.
            // For COD, gateway returned AUTHORIZED (in my stub).
            // So it will call authorize.
          }
        }
      } else {
        // If gateway failed but didn't throw (e.g. declined), we might want to save as FAILED.
        // But current logic returns failure if authResult is failure.
        // If authResult is success but paymentResult.success is false (soft decline?), we handle it here.
        if (paymentResult.errorMessage) {
          payment.fail(paymentResult.errorMessage);
        } else {
          payment.fail('Payment failed at gateway');
        }
      }

      const saveResult = await this.paymentRepository.save(payment);

      if (isFailure(saveResult)) return saveResult;

      return Result.success(
        PaymentDtoMapper.toResponse(saveResult.value.toPrimitives()),
      );
    } catch (error) {
      return ErrorFactory.UseCaseError(
        'Unexpected error creating payment',
        error,
      );
    }
  }
}
